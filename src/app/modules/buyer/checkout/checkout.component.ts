import { ChangeDetectorRef, Component, ElementRef, Inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, NgForm, ValidationErrors, Validators } from '@angular/forms';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { DOCUMENT } from '@angular/common'; 
import { CartService } from 'app/core/cart/cart.service';
import { CartItem } from 'app/core/cart/cart.types';
import { StoresService } from 'app/core/store/store.service';
import { Store, StoreSnooze, StoreTiming } from 'app/core/store/store.types';
import { of, Subject, Subscription, timer, interval as observableInterval, BehaviorSubject } from 'rxjs';
import { takeWhile, scan, tap } from "rxjs/operators";
import { map, switchMap, takeUntil, debounceTime, filter, distinctUntilChanged } from 'rxjs/operators';
import { CheckoutService } from './checkout.service';
import { CheckoutValidationService } from './checkout.validation.service';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Address, CartDiscount, DeliveryProvider, DeliveryProviderGroup, Order, Payment } from './checkout.types';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ModalConfirmationDeleteItemComponent } from './modal-confirmation-delete-item/modal-confirmation-delete-item.component';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { AddAddressComponent } from './add-address/add-address.component';
import { EditAddressComponent } from './edit-address/edit-address.component';
import { AuthService } from 'app/core/auth/auth.service';
import { CustomerAuthenticate } from 'app/core/auth/auth.types';
import { UserService } from 'app/core/user/user.service';
import { Loader } from '@googlemaps/js-api-loader';

@Component({
    selector     : 'buyer-checkout',
    templateUrl  : './checkout.component.html',
    styles       : [
        `
            /** Custom input number **/
            input[type='number']::-webkit-inner-spin-button,
            input[type='number']::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
            }
        
            .custom-number-input input:focus {
            outline: none !important;
            }
        
            .custom-number-input button:focus {
            outline: none !important;
            }

            ::ng-deep .mat-radio-button .mat-radio-ripple{
                display: none;
            }

            .map {
                width: 50vw;
                height: 50vh;
            }
            #pac-input {
                background-color: #fff;
                font-family: Roboto;
                font-size: 15px;
                font-weight: 300;
                padding: 0 11px 0 13px;
                text-overflow: ellipsis;
                width: 400px;
                height: 40px;
            }
              
            #pac-input:focus {
                border-color: #4d90fe;
                padding: 5px 5px 5px 5px;
            }
            
            .pac-controls {
                padding: 5px 11px;
                display: inline-block;
            }
              
            .pac-controls label {
                font-family: Roboto;
                font-size: 13px;
                font-weight: 300;
            }

        `
    ]
})
export class BuyerCheckoutComponent implements OnInit
{

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    @ViewChild('checkoutNgForm') signInNgForm: NgForm;
    @ViewChild('checkoutContainer') checkoutContainer: ElementRef;
    
    checkoutForm: FormGroup;

    currentScreenSize: string[] = [];

    inputPromoCode:string ='';
    discountAmountVoucherApplied: number = 0.00;
    displaydiscountAmountVoucherApplied:any = 0.00;
    customerAuthenticate: CustomerAuthenticate;
    user: any;
    customerAddresses: Address[] = [];

    //------------------------
    //  For map and location
    //------------------------
    
    private map: google.maps.Map;

    @ViewChild('search')public searchElementRef!: ElementRef;
    
    location :any;

    // latitude!: any;
    // longitude!: any;
    center!: google.maps.LatLngLiteral;
    fullAddress:any='';
  
    displayLat:any;
    displayLong:any;

    //string interpolationdoesnt-update-on-eventListener hence need to use behaviour subject
    displayLatitude: BehaviorSubject<string> = new BehaviorSubject<string>('');
    displayLongtitude: BehaviorSubject<string> = new BehaviorSubject<string>('');

    //get current location
    currentLat:any=0;
    currentLong:any=0;

    /**
     * Constructor
     */
    constructor(
        private _formBuilder: FormBuilder,

        private _checkoutService: CheckoutService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirmationService: FuseConfirmationService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _authService: AuthService,
        private _userService: UserService,

        private _datePipe: DatePipe,
        private _dialog: MatDialog,
        private _router: Router,
        @Inject(DOCUMENT) document: Document
    )
    {
    }

    ngOnInit() {

        // //to implement get current location first to be display if in db is null
        navigator.geolocation.getCurrentPosition((position) => {
            var crd = position.coords;
            this.currentLat = crd.latitude;
            this.currentLong= crd.longitude;            
        });              

        //======================== Insert google maps =========================
        //if db got null then we need to set the curren location so that it will display the google maps instead of hardcode the value of latitude and longitude
        
        this.displayLat = this.currentLat;
        this.displayLong = this.currentLong;

        this.displayLatitude.next(this.displayLat.toString());
        this.displayLongtitude.next(this.displayLong.toString());
        // implement google maos
        let loader = new Loader({
            apiKey: 'AIzaSyCFhf1LxbPWNQSDmxpfQlx69agW-I-xBIw',
            libraries: ['places']
            
        })

        //  hardcode value first        
        this.location = {
            lat: this.displayLat,
            lng: this.displayLong,  
        };
        
        loader.load().then(() => {
            this.map = new google.maps.Map(document.getElementById("map"), {
                center: this.location,
                zoom: 15,
                mapTypeControl:false,
                streetViewControl:false,//Removing the pegman from map
                // styles: styles,
                mapTypeId: "roadmap",
            })
    
            const initialMarker = new google.maps.Marker({
            position: this.location,
            map: this.map,
            });
    
            // Create the search box and link it to the UI element.
            const input = document.getElementById("pac-input") as HTMLInputElement;
            const searchBox = new google.maps.places.SearchBox(input);
            
            this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    
            // Bias the SearchBox results towards current map's viewport.
            this.map.addListener("bounds_changed", () => {
                searchBox.setBounds(this.map.getBounds() as google.maps.LatLngBounds);
            });
    
            //use for when user mark other location
            let markers: google.maps.Marker[] = [];
    
            // Listen for the event fired when the user selects a prediction and retrieve
            // more details for that place.
            searchBox.addListener("places_changed", () => {
            const places = searchBox.getPlaces();
        
                if (places.length == 0) {
                    return;
                }
        
                // Clear out the old markers.
                markers.forEach((marker) => {
                    marker.setMap(null);
                });
                markers = [];
    
                // Clear out the init markers.
                initialMarker.setMap(null);
    
                // For each place, get the icon, name and location.
                const bounds = new google.maps.LatLngBounds();
        
                places.forEach((place) => {
        
                    let coordinateStringify = JSON.stringify(place?.geometry?.location);
                    let coordinateParse = JSON.parse(coordinateStringify);
        
                    this.displayLat = coordinateParse.lat;
                    this.displayLong = coordinateParse.lng;

                    this.displayLatitude.next(coordinateParse.lat);
                    this.displayLongtitude.next(coordinateParse.lng);


                    this.location = {
                        lat: coordinateParse.lat,
                        lng: coordinateParse.lng,
                    };
        
                    this.fullAddress = place.address_components.map((data)=>data.long_name)
                
                    if (!place.geometry || !place.geometry.location) {
                        // console.info("Returned place contains no geometry");
                        return;
                    }
            
                    // const icon = {
                    //   url: place.icon as string,
                    //   size: new google.maps.Size(71, 71),
                    //   origin: new google.maps.Point(0, 0),
                    //   anchor: new google.maps.Point(17, 34),
                    //   scaledSize: new google.maps.Size(25, 25),
                    // };
        
                    // Create a marker for each place.
                    markers.push(
                        new google.maps.Marker({
                            map:this.map,
                            // icon,
                            title: place.name,
                            position: place.geometry.location,
                        })
                    );
            
                    if (place.geometry.viewport) {
                        // Only geocodes have viewport.
                        bounds.union(place.geometry.viewport);
                    } else {
                        bounds.extend(place.geometry.location);
                    }
                });
                this.map.fitBounds(bounds);
            });
    
            // Configure the click listener.
            this.map.addListener("click", (event) => {

                //to be display coordinate
                let coordinateClickStringify = JSON.stringify(event.latLng);
                let coordinateClickParse = JSON.parse(coordinateClickStringify);
        
                this.location = {
                    lat: coordinateClickParse.lat,
                    lng: coordinateClickParse.lng,
                };
    
                // Clear out the old markers.
                markers.forEach((marker) => {
                marker.setMap(null);
                });
                markers = [];
    
                // Clear out the init markers1.
                initialMarker.setMap(null);
    
                // Create a marker for each place.
                markers.push(
                new google.maps.Marker({
                    map:this.map,
                    // icon,
                    position: event.latLng,
                })
                );
                this.displayLatitude.next(coordinateClickParse.lat);
                this.displayLongtitude.next(coordinateClickParse.lng);
            
            });
            
        });

        // Create the support form
        this.checkoutForm = this._formBuilder.group({
            // Main Store Section
            id                  : ['undefined'],
            fullName            : ['', Validators.required],
            // firstName           : ['', Validators.required],
            // lastName            : ['', Validators.required],
            email               : ['', [Validators.required, CheckoutValidationService.emailValidator]],
            phoneNumber         : ['', CheckoutValidationService.phonenumberValidator],
            address             : ['', Validators.required],
            storePickup         : [false],
            postCode            : ['', [Validators.required, Validators.minLength(5), Validators.maxLength(10), CheckoutValidationService.postcodeValidator]],
            state               : ['', Validators.required],
            city                : ['', Validators.required],
            deliveryProviderId  : ['', CheckoutValidationService.deliveryProviderValidator],
            country             : [''],
            regionCountryStateId: [''],
            specialInstruction  : [''],
            saveMyInfo          : [true]
        });

        this._authService.customerAuthenticate$
        .subscribe((response: CustomerAuthenticate) => {
            
            this.customerAuthenticate = response;

            // Mark for check
            this._changeDetectorRef.markForCheck();
        });

        // Get customer Addresses
        this._checkoutService.customerAddresses$
        .subscribe((response: Address[]) => {
            
            this.customerAddresses = response
            
        });

        this._userService.get(this.customerAuthenticate.session.ownerId)
        .subscribe((response)=>{

            this.user = response.data
 
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

    displayError(message: string) {
        const confirmation = this._fuseConfirmationService.open({
            "title": "Error",
            "message": message,
            "icon": {
            "show": true,
            "name": "heroicons_outline:exclamation",
            "color": "warn"
            },
            "actions": {
            "confirm": {
                "show": true,
                "label": "Okay",
                "color": "warn"
            },
            "cancel": {
                "show": false,
                "label": "Cancel"
            }
            },
            "dismissible": true
        });

        return confirmation;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------


    addNewAddress() : void 
    {
    const dialogRef = this._dialog.open(
        AddAddressComponent, {
            width: this.currentScreenSize.includes('sm') ? 'auto' : '100%',
            height: this.currentScreenSize.includes('sm') ? 'auto' : '100%',
            maxWidth: this.currentScreenSize.includes('sm') ? 'auto' : '100vw',  
            maxHeight: this.currentScreenSize.includes('sm') ? 'auto' : '100vh',
            disableClose: true,
            });
        
        dialogRef.afterClosed().subscribe();
    }

    editAddress(addressId:string)
    {
        const dialogRef = this._dialog.open(
            EditAddressComponent, {
                width: this.currentScreenSize.includes('sm') ? 'auto' : '100%',
                height: this.currentScreenSize.includes('sm') ? 'auto' : '100%',
                maxWidth: this.currentScreenSize.includes('sm') ? 'auto' : '100vw',  
                maxHeight: this.currentScreenSize.includes('sm') ? 'auto' : '100vh',
                disableClose: true,
                data:{ addressId:addressId }
                });                
            
        //     dialogRef.afterClosed().subscribe(result =>{
        //         if (result.valid === false) {
        //             return;
        //         }
        //     });
    }

    deleteAddress(addressId: string) {
        
        const confirmation = this._fuseConfirmationService.open({
            title  : 'Delete Address',
            message: 'Are you sure you want to remove this Address ?',
            icon:{
                name:"mat_outline:delete_forever",
                color:"primary"
            },
            actions: {
                confirm: {
                    label: 'Delete',
                    color: 'primary'
                }
            }
        });
        // Subscribe to the confirmation dialog closed action
        confirmation.afterClosed().subscribe((result) => {

            // If the confirm button pressed...
            if ( result === 'confirmed' )
            {
                
                // Delete the discount on the server
                this._checkoutService.deleteCustomerAddress(addressId).subscribe(() => {

                    // Close the details
                    // this.closeDetails();
                });
            }
        });
    }

    // getLocation() {
    //     if (navigator.geolocation) {
    //     navigator.geolocation.getCurrentPosition(showPosition);
    //     } else {
    //     alert("Geolocation is not supported by this browser.");
    //     }
    // }
    // showPosition(position) {
    //     var lat = position.coords.latitude;
    //     var lng = position.coords.longitude;
    //     map.setCenter(new google.maps.LatLng(lat, lng));
    // }

    // checkPickupOrder(){
    //     if
    //     this.checkoutForm.get('state').setErrors({required: false});
    //     this.checkoutForm.get('city').setErrors({required: false});
    //     this.checkoutForm.get('postCode').setErrors({required: false});
    //     this.checkoutForm.get('address').setErrors({required: false});
    // }

    redeemPromoCode(){

        // dummy data promo code available
        let voucherCodes =[
            'FREESHIPPING',
            'RAYADEALS'
        ]

        //IF VOUCHER EXIST
        if(voucherCodes.includes(this.inputPromoCode)){
            const confirmation = this._fuseConfirmationService.open({
                title  : '', 
                message: 'Voucher code applied',
                icon       : {
                    show : false,
                },
                actions: {
                    confirm: {
                        label: 'OK',
                        color: 'primary'
                    },
                    cancel : {
                        show : false,
                    }
                }
            });
            //to show the dusocunted price when voucher applied
            this.discountAmountVoucherApplied = 10.50;
            this.displaydiscountAmountVoucherApplied = this.discountAmountVoucherApplied.toFixed(2) 
           
        } 
        else{
            const confirmation = this._fuseConfirmationService.open({
                title  : '',
                message: 'Invalid code, please try again',
                icon       : {
                    show : false,
                },
                actions: {
                    confirm: {
                        label: 'OK',
                        color: 'primary'
                    },
                    cancel : {
                        show : false,
                    }
                }
            });
        }
    }

    selectOnVoucher(value:string){

        //to show the disocunted price when voucher applied
        this.discountAmountVoucherApplied = parseFloat(value);
        this.displaydiscountAmountVoucherApplied = this.discountAmountVoucherApplied.toFixed(2) 
                  
    }
}
