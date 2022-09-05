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
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { environment } from 'environments/environment';
import { CityDetails, RegionCountryState } from 'app/core/location/location.types';
// import { UserProfileValidationService } from '../../user-profile.validation.service';

@Component({
  selector: 'app-edit-cart-address',
  templateUrl: './edit-cart-address.component.html',
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

            .map {
                width: 50vw;
                height: 50vh;
                cursor: pointer !important;  
            }

        `
    ]
})
export class EditCartAddressDialog implements OnInit {

    /** control for the selected bank for multi-selection */
    public regionCountryStateCities: FormControl = new FormControl();

    private _onDestroy = new Subject<void>();
    public filteredCities: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

    @ViewChild('stateCitySelector') stateCitySelector: MatSelect;

    // resultSets: any[];
    // autoCompleteList: any[]

    storeStateCities: CityDetails[] = [];
    storeStateCities$: Observable<City[]>;

    platform: Platform;
    addressForm: FormGroup;
    storeStates: RegionCountryState[] = [];

    countryName: string = '';
    countryCode: string = '';
    
    displayToogleNotDefault: boolean = false;

    dialingCode: string;
    isAddressValid: boolean = true;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    //------------------------
    //  For map and location
    //------------------------
    
    private map: google.maps.Map;
    location :any;
    center!: google.maps.LatLngLiteral;
    fullAddress:any='';
    displayLat:any;
    displayLong:any;
    //get current location (hardcoded to KL first)
    currentLat  :any = 3.1378038301945894;
    currentLong :any = 101.68720603977643;
    user: User

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: any,
        public dialogRef: MatDialogRef<EditCartAddressDialog>,
        private _formBuilder: FormBuilder,
        private _platformsService: PlatformService,
        private _storesService: StoresService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _userService: UserService,
        private _matIconRegistry: MatIconRegistry,
        private _domSanitizer: DomSanitizer,
    )
    {
        this._matIconRegistry
        .addSvgIcon('search',this._domSanitizer.bypassSecurityTrustResourceUrl('assets/layouts/fnb/icons/search.svg'))
    }

    ngOnInit(): void {

        // Create the form
        this.addressForm = this._formBuilder.group({
            id          : [''],
            customerId  : [''],
            name        : ['', Validators.required],
            email       : ['', Validators.required],
            address     : ['', Validators.required],
            city        : ['', Validators.required],
            country     : ['', Validators.required],
            phoneNumber : ['', [UserProfileValidationService.phonenumberValidator, Validators.maxLength(30)]],
            postCode    : ['', [Validators.required, Validators.minLength(5), Validators.maxLength(5), UserProfileValidationService.postcodeValidator]],
            state       : ['Selangor', Validators.required],
            isDefault   : [''],
            latitude    : ['', Validators.required],
            longitude   : ['', Validators.required],
            // locate      : ['']
        });

        this._userService.user$
            .pipe(takeUntil(this._onDestroy))
            .subscribe((result) => {
                    
                this.user = result;
                                    
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
        
        this.setInitialValue();

        // set initial selection
        this.regionCountryStateCities.setValue([]);
        // load the initial bank list
        // this.filteredCities.next(this.cities.slice());

        this.regionCountryStateCities.valueChanges
            .pipe(takeUntil(this._onDestroy))
            .subscribe((result) => {                                
                // Get states by country Z(using symplified backend)
                this._storesService.getStoreRegionCountryStateCity({ stateId: this.addressForm.get('state').value, city: result})
                .subscribe((response)=>{
                    this.storeStateCities = response;

                    // Get state cities (observable)
                    this.storeStateCities$ = this._storesService.storeRegionCities$;                    

                    // Mark for check
                    this._changeDetectorRef.markForCheck();
                });
            });

        this.addressForm.get('state').valueChanges
            .pipe(takeUntil(this._onDestroy))
            .subscribe((result) => {
                
                // Get states by country Z(using symplified backend)
                this._storesService.getStoreRegionCountryStateCity({ stateId: result})
                .subscribe((response)=>{
                    // Get the products
                    this.storeStateCities$ = this._storesService.storeRegionCities$;                    

                    // Mark for check
                    this._changeDetectorRef.markForCheck();
                });
            });

        //to implement get current location first to be display if in db is null
        navigator.geolocation.getCurrentPosition((position) => {
            var crd = position.coords;
            this.currentLat = crd.latitude;
            this.currentLong= crd.longitude;            
        });   
                
        //======================== Insert google maps =========================
        //if db got null then we need to set the curren location so that it will display the google maps instead of hardcode the value of latitude and longitude
        
        if(!this.data.customerAddress) {
            this.displayLat = this.currentLat;
            this.displayLong = this.currentLong;

        } else {
            if(!this.data.customerAddress.latitude  && !this.data.customerAddress.longitude ) {
                this.displayLat = this.currentLat;
                this.displayLong = this.currentLong;
            } else {
                this.displayLat = parseFloat(this.data.customerAddress.latitude) ;
                this.displayLong = parseFloat(this.data.customerAddress.longitude);
            }
        }

        // implement google maps
        let loader = new Loader({
            apiKey: environment.googleMapsAPIKey,
            libraries: ['places']
            
        });

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

            //use for when user mark other location
            let markers: google.maps.Marker[] = [];
                            
            //Trigger when click Relocate
            let geocoder: google.maps.Geocoder;
            const locateButton = document.getElementById("locate-button") as HTMLInputElement;
            // const submitButton =  document.getElementById("submit-btn");
            geocoder = new google.maps.Geocoder();

            locateButton.addEventListener('click',(e)=> {

                let address= this.addressForm.get('address').value + ' ' + this.addressForm.get('city').value +' '+ this.addressForm.get('postCode').value +' '+ this.addressForm.get('state').value +' '+ this.addressForm.get('country').value;
                
                geocoder.geocode({ address: address})
                .then((result) => {
                    const { results } = result
                      
                    // this.resultSets = results;                
                    // this.autoCompleteList = results;  

                    let address = results[0].address_components                    
                    
                    // Find state
                    let stateIndex = address.findIndex(item => item.types.includes("administrative_area_level_1"));
                    let state = address[stateIndex] ? address[stateIndex].long_name : ''
                    this.addressForm.get('state').patchValue(state)

                    // Find city
                    let cityIndex = address.findIndex(item => item.types.includes("locality"));
                    let city = address[cityIndex] ? address[cityIndex].long_name : ''   
                                        
                
                    if(state && state !== '') {  
                        this._storesService.getStoreRegionCountryStateCity({ stateId: state, cityId: city },false)
                        .subscribe((response)=>{

                            let responseIndex = response.findIndex(item => item.name === city)
                            let newResponse = response[responseIndex]                            

                            if(response && response.length) {                      
                                this.addressForm.get('city').patchValue(newResponse.id)
                            } else {
                                this.addressForm.get('city').patchValue('')
                            }
                            // Mark for check
                            this._changeDetectorRef.markForCheck();
                        });
                    }

                    // find postcode
                    let postcodeIndex = address.findIndex(item => item.types.includes("postal_code"))
                    let postcode = address[postcodeIndex] ? address[postcodeIndex].long_name : ''
                    this.addressForm.get('postCode').patchValue(postcode)
                                 
                    //to be display coordinate
                    let coordinateAddressStringify = JSON.stringify(results[0].geometry.location);
                    let coordinateAddressParse = JSON.parse(coordinateAddressStringify);
        
                    this.location = {
                        lat: coordinateAddressParse.lat,
                        lng: coordinateAddressParse.lng,
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
                        position: results[0].geometry.location,
                        })
                    );

                    this.addressForm.get('latitude').patchValue(this.location.lat.toString());
                    this.addressForm.get('longitude').patchValue(this.location.lng.toString());

                    const bounds1 = new google.maps.LatLngBounds();
        
                    bounds1.extend(results[0].geometry.location);
        
                    this.map.fitBounds(bounds1);
                    
                    return results;

                }).catch((e) => { alert("Geocode was not successful for the following reason: " + e);});
            });

            // Configure the click listener.
            this.map.addListener("click", (event) => {
                this.addressForm.markAsDirty();

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

                this.addressForm.get('latitude').patchValue(this.location.lat.toString());
                this.addressForm.get('longitude').patchValue(this.location.lng.toString());
            
            });

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
                
                // Get states by country Z(using symplified backend)
                this._storesService.getStoreRegionCountryState(this.countryCode)
                    .pipe(takeUntil(this._unsubscribeAll))
                    .subscribe((response)=>{
                        this.storeStates = response; 
                        
                        // Mark for check
                        this._changeDetectorRef.markForCheck();
                    });

                let symplifiedCountryStateId = this.addressForm.get('state').value;

                // Get city by state
                this._storesService.getStoreRegionCountryStateCity({stateId: symplifiedCountryStateId})
                .subscribe((response)=>{
                    // Get the products
                    this.storeStateCities$ = this._storesService.storeRegionCities$;                        

                    // Mark for check
                    this._changeDetectorRef.markForCheck();
                });
        });

        if(this.data.type === "create"){
            this.addressForm.get('customerId').setValue(this.data.customerId);
            this.addressForm.get('isDefault').setValue(false);
            this.addressForm.get('country').setValue(this.countryName);
            this.addressForm.get('email').setValue(this.data.user.email);
        } else {
            this.addressForm.patchValue(this.data.customerAddress);
            this.displayToogleNotDefault = this.addressForm.get('isDefault').value === false ? true : false;
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

    checkAddress(address){
        let addressLowerCase = address.toLowerCase();

        let indexOfState =  -1;
        if (this.addressForm.get('state').value !== "") {
            let stateIndex =  this.storeStates.findIndex(item => item.id === this.addressForm.get('state').value);
            indexOfState = addressLowerCase.indexOf(this.storeStates[stateIndex].name.toLowerCase());
        }

        let indexOfCity =  -1;
        if (this.addressForm.get('city').value !== "") {
            let cityIndex =  this.storeStateCities.findIndex(item => item.id === this.addressForm.get('city').value);            
            indexOfCity = cityIndex > -1 ? addressLowerCase.indexOf(this.storeStateCities[cityIndex].name.toLowerCase()) : -1;
        }

        let postcodeIndex = this.addressForm.get('postCode').value !== "" ? addressLowerCase.indexOf(this.addressForm.get('postCode').value) : -1;

        if (indexOfState > -1 || indexOfCity > -1 || postcodeIndex > -1) {
            this.isAddressValid = false;
        } else {
            this.isAddressValid = true;
        }
    }    

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

    private setInitialValue() {
        this.filteredCities
            .pipe(take(1), takeUntil(this._onDestroy))
            .subscribe(() => {
                this.stateCitySelector.compareWith = (a: any, b: any) => a === b;
            });
    }

}
