import { Component, Inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertType } from '@fuse/components/alert';
import { FacebookLoginProvider, GoogleLoginProvider, SocialAuthService } from 'angularx-social-login';
import { AuthService } from 'app/core/auth/auth.service';
import { CustomerAuthenticate, ValidateOauthRequest } from 'app/core/auth/auth.types';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppleLoginProvider } from '../sign-in/apple.provider';
import { AppConfig } from 'app/config/service.config';
import { UserService } from 'app/core/user/user.service';
import { MatDialog } from '@angular/material/dialog';
import { AuthModalComponent } from '../auth-modal/auth-modal.component';
import { CartService } from 'app/core/cart/cart.service';
import { Cart, CartItem } from 'app/core/cart/cart.types';
import { AppleLoginService } from '../apple-login/apple-login.service';


@Component({
    selector     : 'auth-sign-up',
    templateUrl  : './sign-up.component.html',
    encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations
})
export class AuthSignUpComponent implements OnInit
{
    @ViewChild('signUpNgForm') signUpNgForm: NgForm;

    alert: { type: FuseAlertType; message: string } = {
        type   : 'success',
        message: ''
    };
    signUpForm: FormGroup;
    showAlert: boolean = false;
    isError: boolean = false;
    existedEmail: string = ''


    //to be display the text
    titleText: string ='Sign Up';
    descriptionText: string ='Please enter the following details to create your account';
    buttonText: string = 'Sign Up'


    //validate Payload
    validateOauthRequest : ValidateOauthRequest;
    countryCode : string = '';

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    platform: Platform;

    domain :string ='';
    cart: Cart;

    /**
     * Constructor
     */
    constructor(
        public _dialog: MatDialog,
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private _formBuilder: FormBuilder,
        private _route: ActivatedRoute,
        private _socialAuthService: SocialAuthService,
        private _platformsService: PlatformService,
        private _apiServer: AppConfig,
        private _userService: UserService,
        private _cartsService: CartService,
        private _appleLoginService: AppleLoginService

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
        this._route.queryParams.subscribe(params => {
            this.existedEmail = params['email'];

            if (this.existedEmail) {
                this.titleText = 'Account Activation'
                this.descriptionText = 'Please enter the following details to activate your account'
                this.buttonText = 'Activate'
            }
            
        });

        // Create the form
        this.signUpForm = this._formBuilder.group({
                name      : ['', Validators.required],
                username  : ['', Validators.required],
                email     : [ this.existedEmail, [Validators.required, Validators.email]],
                password  : ['', [Validators.required, Validators.minLength(8)]],
                agreements: ['', Validators.requiredTrue],
                domain    : [''],
                countryId : ['']
            }
        );

        if (this.existedEmail) {
            this.signUpForm.get('email').disable()
        }

        // Subscribe to platform data
        this._platformsService.platform$
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe((platform: Platform) => {
            this.platform = platform;

            this.countryCode = this.platform.country;
            this.signUpForm.get('countryId').patchValue(this.countryCode);

        });

        this.domain = this._apiServer.settings.storeFrontDomain;
        this.signUpForm.get('domain').patchValue(this.domain);

    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Sign up
     */
    signUp(): void
    {

        // Patch username with email value
        this.signUpForm.get('username').patchValue(this.signUpForm.get('email').value);

        // Do nothing if the form is invalid
        if ( this.signUpForm.invalid )
        {
            this.isError = true;
            return;
        }

        // Disable the form
        this.signUpForm.disable();

        // Hide the alert
        this.showAlert = false;
        this.isError = false;


        // Sign up
        this._authService.signUp(this.signUpForm.value)
            .subscribe(
                (response) => {

                    // Navigate to the confirmation required page
                    // this._router.navigateByUrl('/confirmation-required');

                    const signInBody = {
                        domain      : this.domain,
                        username    : this.signUpForm.get('username').value,
                        password    : this.signUpForm.get('password').value,
                    }

                    this.signIn(signInBody);
                },
                (response) => {

                    // Re-enable the form
                    this.signUpForm.enable();

                    // Reset the form
                    // this.signUpNgForm.resetForm();

                    // Set the alert
                    let message;
                    
                    if (response.status === 409) {
                        message = response.error.message;
                    } else {
                        message = "Something went wrong, please try again.";
                    }
                    
                    this.alert = {
                        type   : 'error',
                        message: message
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

                
                this._authService.loginOauth(this.validateOauthRequest,'Google Login')
                    .subscribe((loginOauthResponse) => {

                        const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL') ? this._activatedRoute.snapshot.queryParamMap.get('redirectURL') : null;
                        const guestCartId = this._activatedRoute.snapshot.queryParamMap.get('guestCartId') ? this._activatedRoute.snapshot.queryParamMap.get('guestCartId') : null;
                        const storeId = this._activatedRoute.snapshot.queryParamMap.get('storeId') ? this._activatedRoute.snapshot.queryParamMap.get('storeId') : null;

                        // merge multiple guests carts
                        let cartIds: { id: string, storeId: string, cartItems: CartItem[]}[] = this._cartsService.cartIds$ ? JSON.parse(this._cartsService.cartIds$) : [];
                                
                        if (cartIds.length > 0) {

                            this._cartsService.mergeMultipleCarts(loginOauthResponse['session'].ownerId, cartIds.map(cart => cart.id))
                            .subscribe(()=> {
                                // Resolve cart after merge
                                this._cartsService.cartResolver().subscribe();
                                this._cartsService.cartResolver(true).subscribe();
                            })

                        }
                        // Merge cart
                        if (guestCartId && storeId) {  
                        
                            this._cartsService.mergeAndRedirect(guestCartId, storeId, loginOauthResponse['session'].ownerId, redirectURL);
                        
                        } 
                        // if no guestCartId/storeId
                        else {
                            this._cartsService.redirect(redirectURL);
                        }
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

                
                this._authService.loginOauth(this.validateOauthRequest,'Facebook Login')
                    .subscribe((loginOauthResponse) => {      

                        const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL') ? this._activatedRoute.snapshot.queryParamMap.get('redirectURL') : null;
                        const guestCartId = this._activatedRoute.snapshot.queryParamMap.get('guestCartId') ? this._activatedRoute.snapshot.queryParamMap.get('guestCartId') : null;
                        const storeId = this._activatedRoute.snapshot.queryParamMap.get('storeId') ? this._activatedRoute.snapshot.queryParamMap.get('storeId') : null;

                        // merge multiple guests carts
                        let cartIds: { id: string, storeId: string, cartItems: CartItem[]}[] = this._cartsService.cartIds$ ? JSON.parse(this._cartsService.cartIds$) : [];
                                
                        if (cartIds.length > 0) {

                            this._cartsService.mergeMultipleCarts(loginOauthResponse['session'].ownerId, cartIds.map(cart => cart.id))
                            .subscribe(()=> {
                                // Resolve cart after merge
                                this._cartsService.cartResolver().subscribe();
                                this._cartsService.cartResolver(true).subscribe();
                            })

                        }
                        // Merge cart
                        if (guestCartId && storeId) {  
                        
                            this._cartsService.mergeAndRedirect(guestCartId, storeId, loginOauthResponse['session'].ownerId, redirectURL);
                        
                        } 
                        // if no guestCartId/storeId
                        else {
                            this._cartsService.redirect(redirectURL);
                        }
                    },
                    exception => {
                        console.error("An error has occured : ",exception);

                    });
            });
    }

    signInWithApple(): void {

        // store front domain, to be used to compare with redirectURL
        const storeFrontDomain = this._apiServer.settings.storeFrontDomain;

        if (this._activatedRoute.snapshot.queryParamMap.get('guestCartId') && this._activatedRoute.snapshot.queryParamMap.get('storeId') && this._activatedRoute.snapshot.queryParamMap.get('redirectURL')) {  
            const guestCartId = this._activatedRoute.snapshot.queryParamMap.get('guestCartId')
            const storeId = this._activatedRoute.snapshot.queryParamMap.get('storeId')
            const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL')


            if (redirectURL.includes(storeFrontDomain)) {
                // set url to localStorage
                this._appleLoginService.sfUrl = redirectURL;
                this._appleLoginService.guestCartId = guestCartId;
                this._appleLoginService.storeId = storeId;
            }
        
        } 

        // const dialogRef = this._dialog.open( 
        //     AuthModalComponent,{
        //         width : '520px',
        //         maxWidth: '80vw',
        //         data:{ 
        //             icon : 'heroicons_solid:exclamation',
        //             title : 'Disclaimer',
        //             description : 'While using Apple ID to create your DeliverIn account, please select option to "Share My Email" to ensure your DeliverIn account is created properly.'
        //         }
        //     });
        // dialogRef.afterClosed().subscribe((result) => {
        //     // If the confirm button pressed...
        //     this._socialAuthService.signIn(AppleLoginProvider.PROVIDER_ID)
        //         .then(userData => {

        //         });
        // });

        this._socialAuthService.signIn(AppleLoginProvider.PROVIDER_ID)
            .then(userData => {

            });
        
    }

    /**
     * Sign in
     */
    signIn(signInBody): void
    {

        // Sign in
        this._authService.signIn(signInBody)
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

                                const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL') ? this._activatedRoute.snapshot.queryParamMap.get('redirectURL') : null;
                                const guestCartId = this._activatedRoute.snapshot.queryParamMap.get('guestCartId') ? this._activatedRoute.snapshot.queryParamMap.get('guestCartId') : null;
                                const storeId = this._activatedRoute.snapshot.queryParamMap.get('storeId') ? this._activatedRoute.snapshot.queryParamMap.get('storeId') : null;

                                // merge multiple guests carts
                                let cartIds: { id: string, storeId: string, cartItems: CartItem[]}[] = this._cartsService.cartIds$ ? JSON.parse(this._cartsService.cartIds$) : [];
                                
                                if (cartIds.length > 0) {

                                    this._cartsService.mergeMultipleCarts(response.id, cartIds.map(cart => cart.id))
                                    .subscribe(()=> {
                                        // Resolve cart after merge
                                        this._cartsService.cartResolver().subscribe();
                                        this._cartsService.cartResolver(true).subscribe();
                                    })

                                }
                                // Merge cart
                                if (guestCartId && storeId) {  
                                
                                    this._cartsService.mergeAndRedirect(guestCartId, storeId, response.id, redirectURL);
                                
                                } 
                                // if no guestCartId/storeId
                                else {
                                    this._cartsService.redirect(redirectURL);
                                }

                            });                            
                    }
                },
                (error) => {
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

}
