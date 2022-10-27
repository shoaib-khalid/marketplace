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

        // Create the form
        this.addressForm = this._formBuilder.group({
            name        : ['', Validators.required],
            email       : ['', Validators.required],
            phoneNumber : ['', [UserProfileValidationService.phonenumberValidator, Validators.maxLength(30)]],
  
        });

        this._userService.user$
            .pipe(takeUntil(this._onDestroy))
            .subscribe((result) => {
                    
                this.user = result;
                                    
                // Mark for check
                this._changeDetectorRef.markForCheck();
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

        // if(this.data.type === "create"){
        //     this.addressForm.get('customerId').setValue(this.data.customerId);
        //     this.addressForm.get('isDefault').setValue(false);
        //     this.addressForm.get('country').setValue(this.countryName);
        //     this.addressForm.get('email').setValue(this.data.user.email);
        // } else {
        //     this.addressForm.patchValue(this.data.customerAddress);
        // }
        
        if (this.data) {
            this.addressForm.patchValue(this.data.user)
        }

    }

    updateAddress(){

        this.dialogRef.close(this.addressForm.value);

        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    closeDialog(){
        this.dialogRef.close();
    }

    sanitizePhoneNumber(phoneNumber: string) {

        if (phoneNumber.match(/^\+?[0-9]+$/)) {

            let substring = phoneNumber.substring(0, 1)
            let countryId = this.countryCode;
            let sanitizedPhoneNo = ''
            
            if ( countryId === 'MYS' ) {
    
                     if (substring === '6') sanitizedPhoneNo = phoneNumber;
                else if (substring === '0') sanitizedPhoneNo = '6' + phoneNumber;
                else if (substring === '+') sanitizedPhoneNo = phoneNumber.substring(1);
                else                        sanitizedPhoneNo = '60' + phoneNumber;
    
            }
            else if ( countryId === 'PAK') {
    
                     if (substring === '9') sanitizedPhoneNo = phoneNumber;
                else if (substring === '2') sanitizedPhoneNo = '9' + phoneNumber;
                else if (substring === '+') sanitizedPhoneNo = phoneNumber.substring(1);
                else                        sanitizedPhoneNo = '92' + phoneNumber;
    
            }
    
            return sanitizedPhoneNo;
        }
        else {
            return phoneNumber;
        }

    }


}
