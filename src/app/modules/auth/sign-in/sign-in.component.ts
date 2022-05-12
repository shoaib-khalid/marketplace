import { Component, Inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertType } from '@fuse/components/alert';
import { AuthService } from 'app/core/auth/auth.service';
import { CustomerAuthenticate, ValidateOauthRequest } from 'app/core/auth/auth.types';
import { AppConfig } from 'app/config/service.config';
import { UserService } from 'app/core/user/user.service';
import { DOCUMENT } from '@angular/common';
import { FacebookLoginProvider, GoogleLoginProvider, SocialAuthService } from 'angularx-social-login';
import { PlatformService } from 'app/core/platform/platform.service';
import { takeUntil } from 'rxjs/operators';
import { Platform } from 'app/core/platform/platform.types';
import { Subject } from 'rxjs';
import { AppleLoginProvider } from './apple.provider';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { MatDialog } from '@angular/material/dialog';
import { AuthModalComponent } from '../auth-modal/auth-modal.component';
import { HttpStatService } from 'app/mock-api/httpstat/httpstat.service';
import { CartService } from 'app/core/cart/cart.service';
import { Cart } from 'app/core/cart/cart.types';
// import * as saveAs from 'file-saver';

@Component({
    selector     : 'auth-sign-in',
    templateUrl  : './sign-in.component.html',
    encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations
})
export class AuthSignInComponent implements OnInit
{
    @ViewChild('signInNgForm') signInNgForm: NgForm;

    alert: { type: FuseAlertType; message: string } = {
        type   : 'success',
        message: ''
    };
    signInForm: FormGroup;
    showAlert: boolean = false;
    
    //to be display the text
    titleText:string ='Sign In';
    descriptionText:string ='Stay signed in with your account to make searching easier';

    //validate Payload
    validateOauthRequest : ValidateOauthRequest;
    countryCode : string = '';


    platform: Platform;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    domain :string = '';
    cart: Cart;

    /**
     * Constructor
     */
    constructor(
        @Inject(DOCUMENT) private _document: Document,
        public _dialog: MatDialog,
        private _activatedRoute: ActivatedRoute,
        private _userService: UserService,
        private _authService: AuthService,
        private _formBuilder: FormBuilder,
        private _apiServer: AppConfig,
        private _router: Router,
        private _socialAuthService: SocialAuthService,
        private _platformsService: PlatformService,
        private _fuseConfirmationService: FuseConfirmationService,
        private _httpstatService: HttpStatService,
        private _cartsService: CartService,


    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        // Create the form
        this.signInForm = this._formBuilder.group({
            domain      : [''],
            username    : ['', [Validators.required]],
            password    : ['', Validators.required],
            rememberMe  : ['']
        });

        let domain = this._apiServer.settings.storeFrontDomain;
        this.signInForm.get('domain').patchValue(domain);
        this.domain = domain;

        
        // Subscribe to platform data
        this._platformsService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform) => {
                this.platform = platform;

                this.countryCode = this.platform.country;

        });

        // We need to check first the location before we proceed to send the payload
        // this.signInForm.disable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Sign in
     */
    signIn(): void
    {
        // Return if the form is invalid
        if ( this.signInForm.invalid )
        {
            return;
        }

        // Disable the form
        this.signInForm.disable();

        // Hide the alert
        this.showAlert = false;

        // Sign in
        this._authService.signIn(this.signInForm.value)
            .subscribe(
                (customerAuthenticateResponse: CustomerAuthenticate) => {                    
                    if (customerAuthenticateResponse) {
                        this._userService.get(customerAuthenticateResponse.session.ownerId)
                            .subscribe((response)=>{
                                let user = {
                                    "id": response.id,
                                    "name": response.name,
                                    "username": response.username,
                                    "locked": response.locked,
                                    "deactivated": response.deactivated,
                                    "created": response.created,
                                    "updated": response.updated,
                                    "roleId": response.roleId,
                                    "email": response.email,
                                    "avatar": "assets/images/logo/logo_default_bg.jpg",
                                    "status": "online",
                                    "role": response.roleId
                                };
    
                                this._userService.user = user;

                                // cartId
                                if (this._activatedRoute.snapshot.queryParamMap.get('guestCartId') && this._activatedRoute.snapshot.queryParamMap.get('storeId')) {  
                                    const guestCartId = this._activatedRoute.snapshot.queryParamMap.get('guestCartId')
                                    const storeId = this._activatedRoute.snapshot.queryParamMap.get('storeId')

                                    this._cartsService.getCarts(0, 20, storeId, response.id)
                                        .subscribe(response => {

                                            if (response['data'].content.length > 0) {
                                                
                                                this.cart = response['data'].content[0];
                                                
                                                // merge carts
                                                this._cartsService.mergeCart(this.cart.id, guestCartId)
                                                    .subscribe(response => {

                                                        this.redirect();
                                                    })
                                            }
                                            // if no existing cart for the store
                                            else {
                                                this.redirect();
                                            }

                                        })
                                
                                } 
                                // if no guestCartId/storeId, which should not be
                                else {
                                    this.redirect();
                                }


                                
                            });


                            
                    }
                },
                (error) => {

                    // Re-enable the form
                    this.signInForm.enable();

                    // Reset the form
                    this.signInNgForm.resetForm();

                    // Set the alert
                    this.alert = {
                        type   : 'error',
                        message: 'Wrong email or password'
                    };

                    // Show the alert
                    this.showAlert = true;
                }
            );
    }

    signInWithGoogle(): void {
        this._socialAuthService.signIn(GoogleLoginProvider.PROVIDER_ID)
            .then(userData => {
                this.validateOauthRequest = new ValidateOauthRequest();
                this.validateOauthRequest.country = this.countryCode;
                this.validateOauthRequest.email = userData.email;
                this.validateOauthRequest.loginType = "GOOGLE";
                this.validateOauthRequest.name = userData.name;
                this.validateOauthRequest.token = userData.idToken;
                this.validateOauthRequest.domain = this.domain;

                
                this._authService.loginOauth(this.validateOauthRequest,'sign-in-comp-google')
                    .subscribe(() => {

                        // redirectURL
                        const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL')
                        // store front domain, to be used to compare with redirectURL
                        const storeFrontDomain = this._apiServer.settings.storeFrontDomain;
                        
                        if (this._activatedRoute.snapshot.queryParamMap.get('redirectURL')) {  
                            
                            if (redirectURL.includes(storeFrontDomain)) {
                                // Navigate to the external redirect url
                                this._document.location.href = redirectURL;
                            } else {
                                // Navigate to the internal redirect url
                                this._router.navigateByUrl(redirectURL);
                            }
                        }
                        else 
                        {
                            this._router.navigateByUrl('/signed-in-redirect');
                        }

                        // this._router.navigate(['/orders' ]);
                    },
                    exception => {
                        console.error("An error has occured : ",exception);
                    });
            });
    }
    
    signInWithFB(): void {
        this._socialAuthService.signIn(FacebookLoginProvider.PROVIDER_ID)
            .then(userData => {
                this.validateOauthRequest = new ValidateOauthRequest();
                this.validateOauthRequest.country = this.countryCode;
                this.validateOauthRequest.email = userData.email
                this.validateOauthRequest.loginType = "FACEBOOK";
                this.validateOauthRequest.name = userData.name;
                this.validateOauthRequest.token = userData.authToken;
                this.validateOauthRequest.userId = userData.id;
                this.validateOauthRequest.domain = this.domain;

                
                this._authService.loginOauth(this.validateOauthRequest,'sign-in-comp-facebook')
                    .subscribe(() => {                    
                        // redirectURL
                        const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL')
                        // store front domain, to be used to compare with redirectURL
                        const storeFrontDomain = this._apiServer.settings.storeFrontDomain;
                        
                        if (this._activatedRoute.snapshot.queryParamMap.get('redirectURL')) {  
                            
                            if (redirectURL.includes(storeFrontDomain)) {
                                // Navigate to the external redirect url
                                this._document.location.href = redirectURL;
                            } else {
                                // Navigate to the internal redirect url
                                this._router.navigateByUrl(redirectURL);
                            }
                        }
                        else 
                        {
                            this._router.navigateByUrl('/signed-in-redirect');
                        }

                        // this._router.navigate(['/orders' ]);
                    },
                    exception => {
                        console.error("An error has occur : ",exception);

                    });
            });
    }

    signInWithApple(): void {

        const dialogRef = this._dialog.open( 
            AuthModalComponent,{
                width : '520px',
                maxWidth: '80vw',
                data:{ 
                    icon : 'heroicons_solid:exclamation',
                    title : 'Disclaimer',
                    description : 'While using Apple ID to create your DeliverIn account, please select option to "Share My Email" to ensure your DeliverIn account is created properly.'
                }
            });
        dialogRef.afterClosed().subscribe((result) => {
            // If the confirm button pressed...
            this._socialAuthService.signIn(AppleLoginProvider.PROVIDER_ID)
                .then(userData => {

                });
        });
       
   }

   redirect() {

        // Set the redirect url.
        // The '/signed-in-redirect' is a dummy url to catch the request and redirect the user
        // to the correct page after a successful sign in. This way, that url can be set via
        // routing file and we don't have to touch here.                        
        
        // redirectURL
        // store front domain, to be used to compare with redirectURL
        const storeFrontDomain = this._apiServer.settings.storeFrontDomain;
        
        if (this._activatedRoute.snapshot.queryParamMap.get('redirectURL')) {  
            const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL')
            
            if (redirectURL.includes(storeFrontDomain)) {
                // Navigate to the external redirect url
                this._document.location.href = redirectURL;
            } else {
                // Navigate to the internal redirect url
                this._router.navigateByUrl(redirectURL);
            }
        }
        else 
        {
            this._router.navigateByUrl('/signed-in-redirect');
        }

   }
}
