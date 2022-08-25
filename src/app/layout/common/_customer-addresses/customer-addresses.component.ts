import { Location } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from "@angular/core";
import { Subject, takeUntil } from 'rxjs';

import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { DomSanitizer } from "@angular/platform-browser";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

import { AuthService } from "app/core/auth/auth.service";
import { JwtService } from "app/core/jwt/jwt.service";
import { FuseMediaWatcherService } from "@fuse/services/media-watcher";
import { FuseConfirmationService } from "@fuse/services/confirmation";
import { UserService } from "app/core/user/user.service";

import { CustomerAddress, User } from "app/core/user/user.types";
import { EditAddressDialog } from './edit-address/edit-address.component';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector       : 'customer-addresses',
    templateUrl    : './customer-addresses.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs       : 'customer-address'
})
export class _CustomerAddressesComponent implements OnInit, OnDestroy
{
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private _onDestroy = new Subject<void>();

    customersAddresses: CustomerAddress[];
    customerAddress: CustomerAddress = null;
    selectedAddress: CustomerAddress = null;
    
    accountForm: FormGroup;

    alert: any
    currentScreenSize: string[] = [];

    url:any;
    customerId: string;
    user: User;

    longitude: any;
    latitude: any
    originUrl: string;

    /**
    * Constructor
    */
    constructor(
        private _fuseConfirmationService: FuseConfirmationService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _formBuilder: FormBuilder,
        private _dialog: MatDialog,
        private _location: Location,
        private _domSanitizer: DomSanitizer,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _jwtService: JwtService,
        private _authService: AuthService,
        private _userService: UserService,
        private _activatedRoute: ActivatedRoute,
        private _router: Router,

    )
    {
    }

    ngOnInit(): void {

        // Get searches from url parameter 
        this._activatedRoute.queryParams.subscribe(params => {
            this.originUrl = params['origin'];
        });

        this.customerId = this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid ? this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid : null

        // Create the form
        this.accountForm = this._formBuilder.group({
            name    : ['', Validators.required],
            username: ['', Validators.required],
            email   : ['', [Validators.required, Validators.email]],
        
        });

        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User) => {
                if (user) {
                    this.accountForm.patchValue(user);
                }
            });

        this._userService.getCustomerAddresses().subscribe((addresses: CustomerAddress[]) => {
            if (addresses.length < 1)
            {
                setTimeout(() => {
                    this.addAddress();
                    // Mark for check
                    this._changeDetectorRef.markForCheck();
                }, 200);
            }
            // Mark for check
            this._changeDetectorRef.markForCheck();
        });

        this._userService.customersAddresses$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((addresses: CustomerAddress[]) => {
                if (addresses){
                    this.customersAddresses = addresses;
                } 
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        this._userService.customerAddress$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((address: CustomerAddress) => {
                if (address) {
                    this.selectedAddress = address;    
                    
                    if (!this.selectedAddress.latitude && !this.selectedAddress.longitude) {
                        setTimeout(() => {
                            this.editAddress(this.selectedAddress);
                            // Mark for check
                            this._changeDetectorRef.markForCheck();
                        }, 200);
                    }

                    this.latitude = this.selectedAddress.latitude
                    this.longitude = this.selectedAddress.longitude

                    this.url = this._domSanitizer.bypassSecurityTrustResourceUrl('https://maps.google.com/maps?q='+this.latitude+',%20'+this.longitude+'&t=&z=16&ie=UTF8&iwloc=&output=embed');                    
                }    
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // ----------------------
        // Fuse Media Watcher
        // ----------------------

        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({matchingAliases}) => {               

                this.currentScreenSize = matchingAliases;                

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

    }

    /**
    * After view init
    */
    ngAfterViewInit(): void
    {
        // setTimeout(() => {
        //     if (this.customersAddresses.length < 1 )
        //     {
        //         this.addAddress();
        //     }
        // }, 100);

    }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // ---------------------------------------------------------------------
    //                          Public Method
    // ---------------------------------------------------------------------

    /**
    * Send the form
    */
    updateClientProfile(): void
    {
        // Do nothing if the form is invalid
        if ( this.accountForm.invalid )
        {
            return;
        }

        // Hide the alert
        this.alert = false;

        // Disable the form
        this.accountForm.disable();

        // update profile
        this._userService.putCustomerById(this.accountForm.value)
        .subscribe((response)=>{
            // Show a success message (it can also be an error message)
            if(response.status === 202)
            {
                const confirmation = this._fuseConfirmationService.open({
                    title  : 'Success',
                    message: 'Your profile has been updated successfully!',
                    icon: {
                        show: true,
                        name: "heroicons_outline:check",
                        color: "success"
                    },
                    actions: {
                        confirm: {
                            label: 'Ok',
                            color: "primary",
                        },
                        cancel: {
                            show: false,
                        },
                    }
                });
            }

            // Mark for check
            this._changeDetectorRef.markForCheck();
            
        })

        setTimeout(() => {
            this.alert = null;
        }, 7000);

        // Enable the form
        this.accountForm.enable();
    }

    addAddress() {

        let guestAddresses: CustomerAddress[] = this._userService.guestAddress$ ? JSON.parse(this._userService.guestAddress$) : [];
        let length = guestAddresses.length;

        if (!this.customerId && length > 4) {
            const confirmation = this._fuseConfirmationService.open({
                title  : 'Unable to Add Address',
                message: 'You are limited to 5 addresses only as a guest!',
                icon:{
                    name:"heroicons_outline:exclamation",
                    color:"warn"
                },
                actions: {
                    confirm: {
                        label: 'OK',
                        color: 'primary'
                    },
                    cancel: {
                        show: false,
                    },
                }
            });

            return;
        }
        

        const dialogRef = this._dialog.open( 
            EditAddressDialog, {
                width: this.currentScreenSize.includes('sm') ? 'auto' : '100%',
                height: this.currentScreenSize.includes('sm') ? 'auto' : '100%',
                maxWidth: this.currentScreenSize.includes('sm') ? 'auto' : '100vw',  
                maxHeight: this.currentScreenSize.includes('sm') ? 'auto' : '100vh',
                disableClose: true,
                data: {
                    type: "create",
                    customerId: this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid,
                    user: this.accountForm.value
                },
            }
        );    
        dialogRef.afterClosed().subscribe(result=>{
            
            // let guestAddresses: CustomerAddress[] = this._userService.guestAddress$ ? JSON.parse(this._userService.guestAddress$) : [];
            
            if (result) {
                
                if (this.customerId) {
                    //Customer Addresses
                    this._userService.createCustomerAddress(result)
                    .subscribe(()=>{});
                }
                else {
                    let date = new Date;
                    // let length = guestAddresses.length;
                    result.id = ((length + 1).toString()).concat(date.toISOString());
                    // Set to customer address
                    this._userService.customersAddress = result;
                    guestAddresses.push(result);

                    // Set to local
                    this._userService.guestAddress = JSON.stringify(guestAddresses);
                    // Set to customer addresses
                    this.customersAddresses = guestAddresses;
                }
                
            }
        });
    }

    editAddress(customerAddress: CustomerAddress){
        const dialogRef = this._dialog.open(
            EditAddressDialog, {
                width: this.currentScreenSize.includes('sm') ? 'auto' : '100%',
                height: this.currentScreenSize.includes('sm') ? 'auto' : '100%',
                maxWidth: this.currentScreenSize.includes('sm') ? 'auto' : '100vw',  
                maxHeight: this.currentScreenSize.includes('sm') ? 'auto' : '100vh',
                disableClose: true,
                data: {
                    type: "edit",
                    customerAddress: customerAddress
                }
            }
        );
        dialogRef.afterClosed().subscribe(result => {
            
            if(result){
                if (this.customerId){
                    // Customer Addresses
                    this._userService.putCustomerAddressById(result).subscribe(()=>{});

                }
                else {
                    let guestAddresses: CustomerAddress[] = this._userService.guestAddress$ ? JSON.parse(this._userService.guestAddress$) : [];
                    let index = guestAddresses.findIndex(item => item.id === customerAddress.id);
                    
                    if (index > -1) {
                        guestAddresses[index] = result;
    
                        // Update the addresses
                        this._userService.customersAddresses = guestAddresses;

                        // Set to customerAddress
                        if (this.selectedAddress.id === result.id) {
                            this._userService.customersAddress = result;
                        }
    
                        // Set to local
                        this._userService.guestAddress = JSON.stringify(guestAddresses);
                        // Set to customer addresses
                        this.customersAddresses = guestAddresses;
                    }
                }
            } 
        });        
    }

    deleteAddress(customerAddressId) {
        // Open the confirmation dialog
        const confirmation = this._fuseConfirmationService.open({
            title  : 'Delete Address',
            message: 'Are you sure you want to remove this address? This action cannot be undone!',
            actions: {
                confirm: {
                    label: 'Delete'
                }
            }
        });
        // Subscribe to the confirmation dialog closed action
        confirmation.afterClosed().subscribe((result) => {
            // If the confirm button pressed...
            if ( result === 'confirmed' )
            {
                if (this.customerId) {
                    // Delete the customer on the server
                    this._userService.deleteCustomerAddressById(customerAddressId)
                    .subscribe(() => {
                        if (this.selectedAddress.id === customerAddressId) {
                            this._userService.customersAddress = null;
                        }
                    });

                }
                else {
                    let index = this.customersAddresses.findIndex(item => item.id === customerAddressId);

                    if (index > -1) {

                        // Delete the address
                        this.customersAddresses.splice(index, 1);

                        this._userService.customersAddress = null;

                        // Update the address
                        this._userService.customersAddresses = this.customersAddresses;

                        // Set to local
                        this._userService.guestAddress = JSON.stringify(this.customersAddresses);

                    }
                    
                }
            }
        });
    }

    setAsDefault(customerbody) {
        if (this.customerId) {
            // Customer Addresses
            this._userService.setDefaultCustomerAddressById(customerbody).subscribe((resp)=>{
            });
            // this.selectAddress(customerbody.id);
        }
        else {
            this.customersAddresses.forEach(item => {
                item.isDefault = false;
            })

            let index = this.customersAddresses.findIndex(addr => addr === customerbody)

            if (index > -1) {
                this.customersAddresses[index].isDefault = true;
                // Set to local
                this._userService.guestAddress = JSON.stringify(this.customersAddresses);
                // this.selectAddress(customerbody.id);
            }
        }
    }

    selectAddress(addressId) {

        this._userService.getSelectedCustomerAddress(addressId)
        .subscribe(response=>{
            this.customerAddress = response

        })
    }

    backClicked() {
        this._router.navigate(['/' + this.originUrl]);
    }
}