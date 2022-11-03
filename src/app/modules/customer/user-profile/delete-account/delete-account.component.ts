import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { AuthService } from 'app/core/auth/auth.service';
import { JwtService } from 'app/core/jwt/jwt.service';
import { UserService } from 'app/core/user/user.service';
import { User } from 'app/core/user/user.types';
import { finalize, Subject, takeUntil, takeWhile, tap, timer } from 'rxjs';
import { ConfirmDeleteDialog } from './modal-confirm-delete/modal-confirm-delete.component';
import { CookieService } from 'ngx-cookie-service';
import { AppConfig } from 'app/config/service.config';
import { Router } from '@angular/router';

@Component({
    selector       : 'delete-account',
    templateUrl    : './delete-account.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteAccountComponent implements OnInit
{
    currentScreenSize: string[] = [];
    user: User;
    countdown: number = 0;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _userService: UserService,
        private _fuseConfirmationService: FuseConfirmationService,
        public _dialog: MatDialog,
        private _jwtService: JwtService,
        private _authService: AuthService,
        private _cookieService: CookieService,
        private _apiServer: AppConfig,
        private _router: Router    )
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
        // Subscribe to platform data
        this._userService.get(this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response)=>{
                this.user = response;
            });

    }

    deleteAccount(){
        // Show a success message (it can also be an error message)
        const confirmation = this._fuseConfirmationService.open({
            title  : 'Delete Account ?',
            message: 'Confirm to delete your account? Once deleted, it can’t be retrieved.',
            icon: {
                show: true,
                name: "heroicons_outline:exclamation",
                color: "warn"
            },
            actions: {
                confirm: {
                    label: 'Delete',
                    color: "warn",
                },
                cancel: {
                    label: 'Cancel',
                    show : true,
                },
            }
        });
        // Subscribe to the confirmation dialog closed action
        confirmation.afterClosed().subscribe((result) => {
            // If the confirm button pressed...
            if ( result === 'confirmed' )
            {
                if(this.user.channel === 'INTERNAL') {

                    let dialogRef = this._dialog.open(ConfirmDeleteDialog, { disableClose: true, data: this.user});
                } else {

                    // delete account
                    this._userService.deactivateCustomerById().subscribe(response => {});

                    // this._dialog.close();

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

            }
        });
    }
    
}
