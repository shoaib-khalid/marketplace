import { Component, ElementRef, EventEmitter, HostBinding, Input, OnChanges, OnDestroy, OnInit, Output, Renderer2, SimpleChanges, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { debounceTime, filter, map, Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { PlatformService } from 'app/core/platform/platform.service';
import { Platform } from 'app/core/platform/platform.types';
import { Store, StoreAssets } from 'app/core/store/store.types';
import { DatePipe } from '@angular/common';
import { StoreDetails } from '../_search/search.types';

@Component({
    selector     : 'featured-stores',
    templateUrl  : './featured-stores.component.html',
    encapsulation: ViewEncapsulation.None
})
export class _FeaturedStoresComponent implements OnInit, OnDestroy
{

    platform: Platform;
    @Input() stores: Store[] | StoreDetails[];
    @Input() title: string = "Store";
    @Input() showViewAll: boolean = false;
    @Input() redirectURL: { categoryId?: string, locationId?: string } = null;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _platformService: PlatformService,
        private _router: Router,
        private _datePipe: DatePipe,
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {        
        this._platformService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform)=>{
                this.platform = platform;
                
            });                        
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

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any
    {
        return item.id || index;
    }

    chooseStore(storeDomain:string) {
        let slug = storeDomain.split(".")[0]
        this._router.navigate(['/store/' + slug]);
    }

    viewAll(){
        if (this.redirectURL) {
            this._router.navigate(['/store/store-list'], {queryParams: this.redirectURL});
        } else {
            this._router.navigate(['/store/store-list']);
        }
    }
    
    displayStoreLogo(storeAssets: StoreAssets[]) {
        let storeAssetsIndex = storeAssets.findIndex(item => item.assetType === 'LogoUrl');
        if (storeAssetsIndex > -1) {
            return storeAssets[storeAssetsIndex].assetUrl;
        } else {
            return this.platform.logoSquare;
        }
    }

    displayStoreCover(storeAssets: StoreAssets[]) {
        let storeCoverIndex = storeAssets.findIndex(item => item.assetType === 'CoverImageUrl');
        if (storeCoverIndex > -1) {
            return storeAssets[storeCoverIndex].assetUrl;
        } else {
            return this.platform.logoSquare;
        }
    }

    //------------------------
    //      Store Timing
    //------------------------

    checkStoreTiming(store: Store) : { notificationMessage: string, isStoreOpenToday: boolean, messageTitle: string }
    {        
        
        let storeTiming = store.storeTiming;
        let storeId = store.id;
        let notificationMessage : string = ''

        let isStoreOpenToday : boolean = true;

        let daysArray = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        let storesOpening: { 
            storeId: string,
            isOpen : boolean,
            message: string,
            messageTitle :string,
        }[] = [];

        storesOpening.push({
            storeId: storeId,
            isOpen : true,
            message: '',
            messageTitle:'',
        })

        let storeOpeningIndex = storesOpening.findIndex(i => i.storeId === storeId)

        let isStoreSnooze: boolean = store.storeSnooze ? store.storeSnooze.isSnooze : false

        // the only thing that this function required is this.store.storeTiming

        let todayDate = new Date();
        let today = daysArray[todayDate.getDay()];

        // check if store closed for all days
        let isStoreCloseAllDay = storeTiming.map(item => item.isOff);

        // --------------------
        // Check store timing
        // --------------------

        // isStoreCloseAllDay.includes(false) means that there's a day that the store is open
        // hence, we need to find the day that the store is open
        if (isStoreCloseAllDay.includes(false)) {
            storeTiming.forEach((item, index) => {
                if (item.day === today) {
                    // this means store opened
                    if (item.isOff === false) {
                        let openTime = new Date();
                        openTime.setHours(Number(item.openTime.split(":")[0]), Number(item.openTime.split(":")[1]), 0);

                        let closeTime = new Date();
                        closeTime.setHours(Number(item.closeTime.split(":")[0]), Number(item.closeTime.split(":")[1]), 0);

                        if(store && todayDate >= openTime && todayDate < closeTime ) {

                            // --------------------
                            // Check store snooze
                            // --------------------

                            let snoozeEndTime = new Date(store.storeSnooze.snoozeEndTime);
                            let nextStoreOpeningTime: string = "";                            

                            if (isStoreSnooze === true) {

                                // check if snoozeEndTime exceed closeTime
                                if (snoozeEndTime > closeTime) {
                                    // console.info("Store snooze exceed closeTime");

                                    // ------------------------
                                    // Find next available day
                                    // ------------------------

                                    let dayBeforeArray = storeTiming.slice(0, index + 1);
                                    let dayAfterArray = storeTiming.slice(index + 1, storeTiming.length);
                                    
                                    let nextAvailableDay = dayAfterArray.concat(dayBeforeArray);                                
                                    nextAvailableDay.forEach((object, iteration, array) => {
                                        // this means store opened
                                        if (object.isOff === false) {
                                            let nextOpenTime = new Date();
                                            nextOpenTime.setHours(Number(object.openTime.split(":")[0]), Number(object.openTime.split(":")[1]), 0);

                                            let nextCloseTime = new Date();
                                            nextCloseTime.setHours(Number(object.closeTime.split(":")[0]), Number(object.closeTime.split(":")[1]), 0);

                                            if(todayDate >= nextOpenTime){
                                                let nextOpen = (iteration === 0) ? ("tomorrow at " + object.openTime) : ("on " + object.day + " " + object.openTime);
                                                notificationMessage = "Please come back " + nextOpen;
                                                nextStoreOpeningTime = "Please come back " + nextOpen;
                                                array.length = iteration + 1;
                                            }
                                        } else {
                                            // console.warn("Store currently snooze. Store close on " + object.day);
                                            
                                            storesOpening[storeOpeningIndex].messageTitle = 'Sorry! We\'re';
                                            storesOpening[storeOpeningIndex].isOpen = false;
                                            storesOpening[storeOpeningIndex].message = notificationMessage;
                                        }
                                    });

                                } else {
                                    let dateConverted = new Date(store.storeSnooze.snoozeEndTime.replace(/-/g, "/")).toISOString();
                                    nextStoreOpeningTime = "Store will open at " + this._datePipe.transform(dateConverted,'EEEE, h:mm a');
                                }                                

                                if (store.storeSnooze.snoozeReason && store.storeSnooze.snoozeReason !== null) {
                                    // notificationMessage = "Store is closed due to " + store.storeSnooze.snoozeReason + ". " + nextStoreOpeningTime;
                                    notificationMessage = nextStoreOpeningTime;
                                    storesOpening[storeOpeningIndex].messageTitle = 'Sorry! We\'re';
                                    storesOpening[storeOpeningIndex].isOpen = false;
                                    storesOpening[storeOpeningIndex].message = notificationMessage;

                                } else {
                                    notificationMessage = '';
                                    
                                    storesOpening[storeOpeningIndex].messageTitle = 'Temporarily';
                                    storesOpening[storeOpeningIndex].isOpen = false;
                                    storesOpening[storeOpeningIndex].message = notificationMessage;
                                }
                            }
                            
                            // ---------------------
                            // check for break hour
                            // ---------------------
                            if ((item.breakStartTime && item.breakStartTime !== null) && (item.breakEndTime && item.breakEndTime !== null)) {
                                let breakStartTime = new Date();
                                breakStartTime.setHours(Number(item.breakStartTime.split(":")[0]), Number(item.breakStartTime.split(":")[1]), 0);
    
                                let breakEndTime = new Date();
                                breakEndTime.setHours(Number(item.breakEndTime.split(":")[0]), Number(item.breakEndTime.split(":")[1]), 0);

                                if(todayDate >= breakStartTime && todayDate < breakEndTime ) {
                                    // console.info("We are on BREAK! We will open at " + item.breakEndTime);
                                    notificationMessage = "We will open at " + item.breakEndTime;

                                    storesOpening[storeOpeningIndex].messageTitle = 'Sorry! We\'re';
                                    storesOpening[storeOpeningIndex].isOpen = false;
                                    storesOpening[storeOpeningIndex].message = notificationMessage;
                                }
                            }
                        } else if (todayDate < openTime) {
                            // this mean it's open today but it's before store opening hour (store not open yet)
                            notificationMessage = "Please come back at " + item.openTime;
                            
                            storesOpening[storeOpeningIndex].messageTitle = 'Sorry! We\'re';
                            storesOpening[storeOpeningIndex].isOpen = false;
                            storesOpening[storeOpeningIndex].message = notificationMessage;

                        } else {

                            // console.info("We are CLOSED for the day!");

                            // ------------------------
                            // Find next available day
                            // ------------------------

                            let dayBeforeArray = storeTiming.slice(0, index + 1);
                            let dayAfterArray = storeTiming.slice(index + 1, storeTiming.length);
                            
                            let nextAvailableDay = dayAfterArray.concat(dayBeforeArray);                                
                            nextAvailableDay.forEach((object, iteration, array) => {
                                // this mean store opened
                                if (object.isOff === false) {
                                    let nextOpenTime = new Date();
                                    nextOpenTime.setHours(Number(object.openTime.split(":")[0]), Number(object.openTime.split(":")[1]), 0);

                                    let nextCloseTime = new Date();
                                    nextCloseTime.setHours(Number(object.closeTime.split(":")[0]), Number(object.closeTime.split(":")[1]), 0);

                                    if(todayDate >= nextOpenTime){
                                        let nextOpen = (iteration === 0) ? ("tomorrow at " + object.openTime) : ("on " + object.day + " " + object.openTime);
                                        // console.info("We will open " + nextOpen);
                                        notificationMessage = "Please come back " + nextOpen;
                                        
                                        storesOpening[storeOpeningIndex].messageTitle = 'Sorry! We\'re';
                                        storesOpening[storeOpeningIndex].isOpen = false;
                                        storesOpening[storeOpeningIndex].message = notificationMessage;

                                        array.length = iteration + 1;
                                    }
                                } else {
                                    // console.warn("Store close on " + object.day);
                                }
                            });
                        }
                    } else {

                        // console.warn("We are CLOSED today");
                        
                        // ------------------------
                        // Find next available day
                        // ------------------------

                        let dayBeforeArray = storeTiming.slice(0, index + 1);
                        let dayAfterArray = storeTiming.slice(index + 1, storeTiming.length);
                        
                        let nextAvailableDay = dayAfterArray.concat(dayBeforeArray);
            
                        nextAvailableDay.forEach((object, iteration, array) => {
                            // this mean store opened
                            if (object.isOff === false) {
                                
                                let nextOpenTime = new Date();                    
                                nextOpenTime.setHours(Number(object.openTime.split(":")[0]), Number(object.openTime.split(":")[1]), 0);
                                
                                let nextCloseTime = new Date();
                                nextCloseTime.setHours(Number(object.closeTime.split(":")[0]), Number(object.closeTime.split(":")[1]), 0);
                                    
                                if(todayDate >= nextOpenTime){
                                    let nextOpen = (iteration === 0) ? ("tomorrow at " + object.openTime) : ("on " + object.day + " " + object.openTime);
                                    // console.info("We will open " + nextOpen);
                                    notificationMessage = "Please come back " + nextOpen;
                                    
                                    storesOpening[storeOpeningIndex].messageTitle =  'Sorry! We\'re';
                                    storesOpening[storeOpeningIndex].isOpen = false;
                                    storesOpening[storeOpeningIndex].message = notificationMessage;

                                    array.length = iteration + 1;
                                }
                            } else {
                                notificationMessage = "We are closed today";
                                storesOpening[storeOpeningIndex].messageTitle = 'Temporarily';
                                storesOpening[storeOpeningIndex].isOpen = false;
                                storesOpening[storeOpeningIndex].message = notificationMessage;
                                // console.warn("Store close on this " + object.day);
                            }
                        });
                    }
                }
            });
            
        } else {
            // this indicate that store closed for all days
            notificationMessage = '';

            storesOpening[storeOpeningIndex].messageTitle = 'Temporarily';
            storesOpening[storeOpeningIndex].isOpen = false;
            storesOpening[storeOpeningIndex].message = notificationMessage;

        }
        // check if store open today
        isStoreOpenToday = storesOpening[storeOpeningIndex].isOpen;
                
        if(!isStoreOpenToday){
            return {
                notificationMessage: notificationMessage,
                isStoreOpenToday: isStoreOpenToday,
                messageTitle: storesOpening[storeOpeningIndex].messageTitle
            }
        } else {
            return null
        }

    }

}
