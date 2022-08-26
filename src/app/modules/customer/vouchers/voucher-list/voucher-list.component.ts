import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { AuthService } from 'app/core/auth/auth.service';
import { CustomerAuthenticate } from 'app/core/auth/auth.types';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { StoresService } from 'app/core/store/store.service';
import { Store } from 'app/core/store/store.types';
import { merge, Subject } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';
import { VoucherModalComponent } from '../voucher-modal/voucher-modal.component';
import { VoucherService } from 'app/core/_voucher/voucher.service';
import { CustomerVoucher, CustomerVoucherPagination, UsedCustomerVoucherPagination, Voucher } from 'app/core/_voucher/voucher.types';
import { Title } from '@angular/platform-browser';

@Component({
    selector     : 'voucher-list',
    templateUrl  : './voucher-list.component.html',
    styles       : [`

        .mat-tab-group {

            /* No header */
            &.fuse-mat-no-header {
        
                .mat-tab-header {
                    height: 0 !important;
                    max-height: 0 !important;
                    border: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                }
            }
        
            .mat-tab-header {
                border-bottom: flex !important;
        
                .mat-tab-label-container {
                    padding: 0 0px;
        
                    .mat-tab-list {
        
                        .mat-tab-labels {
        
                            .mat-tab-label {
                                min-width: 0 !important;
                                height: 40px !important;
                                padding: 0 20px !important;
                                @apply text-secondary;
        
                                &.mat-tab-label-active {
                                    @apply bg-primary-700 bg-opacity-0 dark:bg-primary-50 dark:bg-opacity-0 #{'!important'};
                                    @apply text-primary #{'!important'};
                                }
        
                                + .mat-tab-label {
                                    margin-left: 0px;
                                }
        
                                .mat-tab-label-content {
                                    line-height: 20px;
                                }
                            }
                        }
        
                        .mat-ink-bar {
                            display: flex !important;
                        }
                    }
                }
            }
        
            .mat-tab-body-content {
                padding: 0px;
            }
        }
    
        
    `],
    encapsulation: ViewEncapsulation.None
})
export class VoucherListComponent implements OnInit, OnDestroy
{
    @ViewChild("customerVoucher", {read: MatPaginator}) private _customerVoucherPagination: MatPaginator;
    @ViewChild("usedCustomerVoucher", {read: MatPaginator}) private _usedCustomerVoucherPagination: MatPaginator;

    platform: Platform;
    inputPromoCode: string ='';
    isLoading: boolean = false;
    pageOfItems: Array<any>;
    customerAuthenticate: CustomerAuthenticate;

    customerVoucher: CustomerVoucher[] = [] ;
    customerVoucherPagination: CustomerVoucherPagination;

    usedCustomerVoucher: CustomerVoucher[] = [] ;
    usedCustomerVoucherPagination: UsedCustomerVoucherPagination;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        public _dialog: MatDialog,
        private _fuseConfirmationService: FuseConfirmationService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _voucherService: VoucherService,
        private _authService: AuthService,
        private _platformService : PlatformService,
        private _storesService: StoresService,
        private _titleService: Title
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
        // don't display this, if you do, customer will see all the voucher code and get free item all the time la
        // this._voucherService.getAvailableVoucher().subscribe(response => {});

        // Get customer Authenticate to get customer id
        this._authService.customerAuthenticate$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: CustomerAuthenticate) => {
                if (response) {
                    this.customerAuthenticate = response;                
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get unused customer voucher
        this._voucherService.customerVouchers$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: CustomerVoucher[]) => {
                if (response) {
                    this.customerVoucher = response;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get used customer voucher
        this._voucherService.usedCustomerVouchers$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: CustomerVoucher[]) => {
                if (response) {
                    this.usedCustomerVoucher = response;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get customer voucher pagination, isUsed = false 
        this._voucherService.customerVouchersPagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: CustomerVoucherPagination) => {
                if (response) {
                    this.customerVoucherPagination = response; 
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();           
            });

        // Get used customer voucher pagination, isUsed = true 
        this._voucherService.usedCustomerVoucherPagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: UsedCustomerVoucherPagination) => {
                if (response) {
                    this.usedCustomerVoucherPagination = response;
                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get platform service to get logo based on country (deliverin/easydukan) 
        this._platformService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response: Platform) => {
                if (response) {
                    this.platform = response;

                    // set title
                    this._titleService.setTitle(this.platform.name + " | " + "Vouchers");

                }
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
    }

    /**
    * After view init
    */
    ngAfterViewInit(): void
    {
        setTimeout(() => {
            if (this._customerVoucherPagination )
            {
                // Mark for check
                this._changeDetectorRef.markForCheck();

                // Get products if sort or page changes
                merge(this._customerVoucherPagination.page).pipe(
                    switchMap(() => {
                        this.isLoading = true;
                        return this._voucherService.getAvailableCustomerVoucher(false, 0, 10);
                    }),
                    map(() => {
                        this.isLoading = false;
                    })
                ).subscribe();
            }

            if (this._usedCustomerVoucherPagination )
            {
                // Mark for check
                this._changeDetectorRef.markForCheck();

                // Get products if sort or page changes
                merge(this._usedCustomerVoucherPagination.page).pipe(
                    switchMap(() => {
                        this.isLoading = true;
                        return this._voucherService.getAvailableCustomerVoucher(true, 0, 10);
                    }),
                    map(() => {
                        this.isLoading = false;
                    })
                ).subscribe();
            }
        }, 0);
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
      
    }

    onChangePage(pageOfItems: Array<any>) {
        
        // update current page of items
        this.pageOfItems = pageOfItems;
        
        if(this.customerVoucherPagination && this.pageOfItems['currentPage']){

            if (this.pageOfItems['currentPage'] - 1 !== this.customerVoucherPagination.page) {
                // set loading to true
                this.isLoading = true;
    
                this._voucherService.getAvailableCustomerVoucher(false,this.pageOfItems['currentPage'] - 1, this.pageOfItems['pageSize'])
                    .subscribe((response)=>{
                            
                        // set loading to false
                        this.isLoading = false;
                    });
                    
            }
        }

        if(this.usedCustomerVoucherPagination && this.pageOfItems['currentPage']){

            if (this.pageOfItems['currentPage'] - 1 !== this.usedCustomerVoucherPagination.page) {
                // set loading to true
                this.isLoading = true;
    
                this._voucherService.getAvailableCustomerVoucher(true,this.pageOfItems['currentPage'] - 1, this.pageOfItems['pageSize'])
                    .subscribe((response)=>{
                        
                        // set loading to false
                        this.isLoading = false;
                    });
                    
            }
        }
        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    enterPromoCode() {

        // do nothing if no promo code entered
        if (this.inputPromoCode === ''){
            return;
        }

        this._voucherService.postCustomerClaimVoucher(this.customerAuthenticate.session.ownerId, this.inputPromoCode)
        .subscribe((response) => {
            // if voucher is valid
            this.openVoucherModal('mat_solid:check_circle','Congratulations', 'Promo code successfully added', null, {width: '255px', maxWidth: '80vw'});
            this.inputPromoCode = '';
            
        }, (error) => {
            // if voucher is invalid
            if (error.status === 404) {
                this.openVoucherModal('heroicons_outline:x','Invalid Code!', 'Invalid code, please try again', null, {width: '255px', maxWidth: '80vw'});
                this.inputPromoCode = '';
            } else if (error.status === 409) {
                this.openVoucherModal('heroicons_outline:x','Oops..', 'Sorry, you have redeemed this voucher', null, {width: '255px', maxWidth: '80vw'});
                this.inputPromoCode = '';
            } else if (error.status === 417) {
                this.openVoucherModal('heroicons_outline:x','Oops..', 'Sorry, this promo code has expired', null, {width: '255px', maxWidth: '80vw'});
                this.inputPromoCode = '';
            }
        });
    }

    openVoucherModal(icon: string, title: string, description: string, voucher: CustomerVoucher, size?) : void {

        let storeName = '';
        if (voucher != null && voucher.voucher.storeId != null) {
            this._storesService.getStoreById(voucher.voucher.storeId)
                .subscribe((response: Store) => {
    
                storeName = response.name;
                const dialogRef = this._dialog.open( 
                VoucherModalComponent,{
                    width: size ? size.width : '520px',
                    maxWidth: size ? size.maxWidth : '80vw',
                    data:{ 
                        icon,
                        title,
                        description,
                        voucher, 
                        storeName
                    }
                });
                dialogRef.afterClosed().subscribe();
                
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
        }
        else {
            const dialogRef = this._dialog.open( 
                VoucherModalComponent,{
                    width: size ? size.width : '520px',
                    maxWidth: size ? size.maxWidth : '80vw',
                    data:{ 
                        icon,
                        title,
                        description,
                        voucher, 
                        storeName: null
                    }
                });
                dialogRef.afterClosed().subscribe();
        }
    }

}
