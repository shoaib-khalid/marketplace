import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject, takeUntil, timer, finalize, takeWhile, tap } from 'rxjs';
import { ChangeDetectorRef, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { UserService } from 'app/core/user/user.service';
import { AuthService } from 'app/core/auth/auth.service';
import { CookieService } from 'ngx-cookie-service';
import { AppConfig } from 'app/config/service.config';
import { Router } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
// import { UserProfileValidationService } from '../../user-profile.validation.service';

@Component({
    selector: 'modal-confirm-delete',
    templateUrl: './modal-confirm-delete.component.html',

})
export class ConfirmDeleteDialog implements OnInit {

    deleteAccountForm: FormGroup;
    countdown: number = 0;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: any,
        public dialogRef: MatDialogRef<ConfirmDeleteDialog>,
        private _formBuilder: FormBuilder,
        private _fuseConfirmationService: FuseConfirmationService,
        private _userService: UserService,
        private _authService: AuthService,
        private _cookieService: CookieService,
        private _apiServer: AppConfig,
        private _router: Router
    )
    {
    }

    ngOnInit(): void {

        // Create the forms
        this.deleteAccountForm = this._formBuilder.group({
            password       : ['', Validators.required],
        });

    }

    deleteAccount(){
        // validate password first before deleting account
        this._userService.validatePasswordCustomerById(this.deleteAccountForm.get('password').value).
            subscribe(response => {
                if(response.status === 200) {
                    // delete account
                    this._userService.deactivateCustomerById().subscribe(response => {});

                    this.dialogRef.close();

                    // Sign out
                    this._authService.signOut();

                    // set user observable to null when logout 
                    this._userService.user = null;


                    // // for localhost testing
                    // this._cookieService.delete('CustomerId');
                    // this._cookieService.delete('RefreshToken');
                    // this._cookieService.delete('AccessToken');

                    this._cookieService.delete('CustomerId','/', this._apiServer.settings.storeFrontDomain);
                    this._cookieService.delete('RefreshToken','/', this._apiServer.settings.storeFrontDomain);
                    this._cookieService.delete('AccessToken','/', this._apiServer.settings.storeFrontDomain);

                    // this._document.location.href = 'https://' + this._apiServer.settings.marketplaceDomain + '/sign-out' +
                    //     '?redirectURL=' + encodeURI('https://' + this.sanatiseUrl);

                    // Redirect after the countdown
                    timer(0, 1000)
                        .pipe(
                            finalize(() => {
                                this._router.navigate(['sign-out']);
                            }),
                            takeWhile(() => this.countdown > 0),
                            takeUntil(this._unsubscribeAll),
                            tap(() => this.countdown--)
                        )
                        .subscribe();
                }
                
            },(error) => {

                // Show a success message (it can also be an error message)
                const confirmation = this._fuseConfirmationService.open({
                    title  : 'Wrong Password',
                    message: 'Please make sure the password is correct',
                    icon: {
                        show: true,
                        name: "heroicons_outline:x",
                        color: "warn"
                    },
                    actions: {
                        confirm: {
                            label: 'OK',
                            color: "accent",
                        },
                        cancel: {
                            label: 'Cancel',
                            show : false,
                        },
                    }
                });

                this.deleteAccountForm.reset()
            });
    }


    closeDialog(){
        this.dialogRef.close();
    }

}
