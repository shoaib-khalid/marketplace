import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { StoresService } from 'app/core/store/store.service';
import { City } from 'app/core/store/store.types';
import { Observable, ReplaySubject, BehaviorSubject, Subject, takeUntil, take } from 'rxjs';
import { ChangeDetectorRef, Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { Loader } from '@googlemaps/js-api-loader';
import { UserProfileValidationService } from 'app/modules/customer/user-profile/user-profile.validation.service';
import { UserService } from 'app/core/user/user.service';
import { User } from 'app/core/user/user.types';
import { environment } from 'environments/environment';
// import { UserProfileValidationService } from '../../user-profile.validation.service';

@Component({
    selector: 'modal-confirm-delete',
    templateUrl: './modal-confirm-delete.component.html',

})
export class ConfirmDeleteDialog implements OnInit {


    private _onDestroy = new Subject<void>();

    @ViewChild('stateCitySelector') stateCitySelector: MatSelect;


    platform: Platform;
    addressForm: FormGroup;
    storeStates: string[] = [];

    dialingCode: string;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    user: User
    countryCode: string;
    countryName: string;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: any,
        public dialogRef: MatDialogRef<ConfirmDeleteDialog>,
        private _formBuilder: FormBuilder,
        private _platformsService: PlatformService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _userService: UserService,
    )
    {
    }

    ngOnInit(): void {

        // Create the forms
        this.addressForm = this._formBuilder.group({
            password       : ['', Validators.required],
        });

        
        // Subscribe to platform data
        this._platformsService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform) => {
                this.platform = platform;
            
                this.countryCode = this.platform.country;
                this.countryName = this.countryCode === 'MYS' ? 'Malaysia': 'Pakistan';

                // -------------------------
                // Set Dialing code
                // -------------------------
                
                let countryId = this.countryCode;
                switch (countryId) {
                    case 'MYS':
                        this.dialingCode = '60'
                        break;
                    case 'PAK':
                        this.dialingCode = '92'
                        break;
                    default:
                        break;
                }
        });


    }

    closeDialog(){
        this.dialogRef.close();
    }

}
