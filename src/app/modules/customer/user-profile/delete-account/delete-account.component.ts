import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { AuthService } from 'app/core/auth/auth.service';
import { JwtService } from 'app/core/jwt/jwt.service';
import { UserService } from 'app/core/user/user.service';
import { CustomerAddress } from 'app/core/user/user.types';
import { Observable, Subject, takeUntil } from 'rxjs';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { ConfirmDeleteDialog } from './modal-confirm-delete/modal-confirm-delete.component';

@Component({
    selector       : 'delete-account',
    templateUrl    : './delete-account.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeleteAccountComponent implements OnInit
{
    currentScreenSize: string[] = [];

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _formBuilder: FormBuilder,
        private _userService: UserService,
        private _fuseConfirmationService: FuseConfirmationService,
        private _changeDetectorRef: ChangeDetectorRef,
        public _dialog: MatDialog,
        private _jwtService: JwtService,
        private _authService: AuthService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
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
                let dialogRef = this._dialog.open(ConfirmDeleteDialog, { disableClose: true, data:{ delete: true }});

            }
        });
    }
    
}
