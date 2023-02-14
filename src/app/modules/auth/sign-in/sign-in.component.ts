import { ChangeDetectorRef, Component, Inject, NgZone, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertType } from '@fuse/components/alert';
import { AuthService } from 'app/core/auth/auth.service';
import { CustomerAuthenticate, ValidateOauthRequest } from 'app/core/auth/auth.types';
import { AppConfig } from 'app/config/service.config';
import { UserService } from 'app/core/user/user.service';
import { FacebookLoginProvider, GoogleLoginProvider, SocialAuthService } from 'angularx-social-login';
import { PlatformService } from 'app/core/platform/platform.service';
import { takeUntil } from 'rxjs/operators';
import { Platform } from 'app/core/platform/platform.types';
import { Subject } from 'rxjs';
import { AppleLoginProvider } from './apple.provider';
import { MatDialog } from '@angular/material/dialog';
import { AuthModalComponent } from '../auth-modal/auth-modal.component';
import { HttpStatService } from 'app/mock-api/httpstat/httpstat.service';
import { CartService } from 'app/core/cart/cart.service';
import { Cart, CartItem } from 'app/core/cart/cart.types';
import { AppleLoginService } from '../apple-login/apple-login.service';
import { Capacitor } from '@capacitor/core';
import { DeepLinksService } from 'app/core/_deeplinks/deeplinks.service';
import { SocialLooginClientId } from './oauth.types';
import jwt_decode from "jwt-decode";

declare const google: any;

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

    displaySocial: boolean = true;

    /**
     * Constructor
     */
    constructor(
        public _dialog: MatDialog,
        private _activatedRoute: ActivatedRoute,
        private _userService: UserService,
        private _authService: AuthService,
        private _formBuilder: FormBuilder,
        private _apiServer: AppConfig,
        private _socialAuthService: SocialAuthService,
        private _platformsService: PlatformService,
        private _httpstatService: HttpStatService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _cartsService: CartService,
        private _appleLoginService: AppleLoginService,
        private _deepLinksService: DeepLinksService,
        private _ngZone: NgZone  //the navigation will be triggered outside Angular zone

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
            email       : ['', [Validators.required, Validators.email]],
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
                if (platform) {
                    this.platform = platform;
                    this.countryCode = this.platform.country;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
        });

        // this._deepLinksService.getDeeplinks()
        // .pipe(takeUntil(this._unsubscribeAll))
        // .subscribe((deepLinks) => {               

        //     console.log('deepLinks', deepLinks);
            
        //     // this.post = deepLinks;                

        //     // Mark for check
        //     this._changeDetectorRef.markForCheck();
        // }, (error)=> {
        //     console.log("disini", error);
            
        // });

        // We need to check first the location before we proceed to send the payload
        // this.signInForm.disable();
        if(Capacitor.isNativePlatform()) {
            this.displaySocial = false;
        }


    }

    ngAfterViewInit() {

        setTimeout(() => {
            google.accounts.id.initialize({
                client_id: SocialLooginClientId.GOOGLE_CLIENT_ID,
                //Collect the token that Google returns to us when logging in
                callback: (response: any) => this._ngZone.run(() => {
                  this.handleGoogleSignIn(response);
                })
            });
    
            //Use customized button for Google Sign-in
            google.accounts.id.renderButton(
            //    this.gbutton.nativeElement,
            document.getElementById('googleButton'),
                { size: "large", text: 'signup_with', theme:"filled_blue", shape:"circle", type:"icon" }
            );

            // Mark for check
            this._changeDetectorRef.markForCheck();
            
        }, 10);

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
        this._authService.signIn({username: this.signInForm.get('email').value, password: this.signInForm.get('password').value, domain: this.signInForm.get('domain').value })
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

                    // Re-enable the form
                    this.signInForm.enable();

                    // Reset the form
                    this.signInNgForm.resetForm();

                    // Set the alert
                    this.alert = {
                        type   : 'error',
                        message: error.error.message
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

                        // Open native App
                        if(Capacitor){
                            
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

        // redirectURL
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

    handleGoogleSignIn(response: any) {
        // Decode Google Token
        let userObject: ValidateOauthRequest = jwt_decode(response.credential);
        if (userObject) {

            let userData = {
                email         : userObject.email,
                loginType     : "GOOGLE",
                name          : userObject.name,
                token         : response.credential
            }
            
            this.validateOauthRequest = new ValidateOauthRequest();
            this.validateOauthRequest.country = this.countryCode;
            this.validateOauthRequest.email = userData.email;
            this.validateOauthRequest.loginType = "GOOGLE";
            this.validateOauthRequest.name = userData.name;
            this.validateOauthRequest.token = userData.token;
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

                    // Open native App
                    if(Capacitor){
                        
                    }
                },
                exception => {
                    console.error("An error has occured : ",exception);
                });
        }

    }

}
