import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, ReplaySubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CustomerActivity } from './analytic.types';
import { AppConfig } from 'app/config/service.config';
import { JwtService } from 'app/core/jwt/jwt.service';
import { LogService } from 'app/core/logging/log.service';
import { AuthService } from '../auth/auth.service';
import { DeviceDetectorService } from 'ngx-device-detector';
import { IpAddressService } from '../ip-address/ip-address.service';
import { StoresService } from '../store/store.service';
import { UserService } from '../user/user.service';
import { CurrentLocationService } from '../_current-location/current-location.service';

@Injectable({
    providedIn: 'root'
})
export class AnalyticService
{

    private _customerActivity: ReplaySubject<CustomerActivity> = new ReplaySubject<CustomerActivity>(1);
    /**
     * Constructor
     */
    constructor(
        private _httpClient: HttpClient,
        private _apiServer: AppConfig,
        private _authService: AuthService,
        private _logging: LogService,
        private _deviceService: DeviceDetectorService,
        private _ipAddressService: IpAddressService,
        private _userService: UserService,
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /** Getter for customer activity */
    get customerActivity$(): Observable<CustomerActivity> { return this._customerActivity.asObservable(); }

    /** Setter for customer activity */
    set customerActivity(value: CustomerActivity) { this._customerActivity.next(value); }


    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    resolveAnalytic(): Observable<any>
    {
        return of(true).pipe(
            map((response)=>{

                //get device info (browser info, os info, device nodel infp)
                let device = this._deviceService.getDeviceInfo();
                let deviceBrowser = device.browser + ' ' + device.browser_version
                let deviceOs = device.os_version
                let deviceModel = device.deviceType + ' ' + device.device

                this._ipAddressService.getIPAddress()
                    .subscribe((ipAddressResponse)=>{
                        const body = {
                            id      : this._userService.userSessionId$ !== '' ? this._userService.userSessionId$ : null,
                            ip      : ipAddressResponse.ip_addr,
                            os      : deviceOs,
                            device  : deviceModel,
                            browser : deviceBrowser,
                            created : new Date().toISOString() + "",
                            updated : new Date().toISOString() + ""
                        }

                        if (!this._userService.userSessionId$ || this._userService.userSessionId$ === "") {
                            this._userService.generateSession(body).subscribe((generateSessionResponse)=>{
                                this._userService.userSessionId = generateSessionResponse.id;
                            });
                        }
                    });
            })
        );
    }

    /**
    * Create the cart
    *
    * @param cart
    */
    postActivity(bodyActivity: CustomerActivity): Observable<any>
    {   
        let analyticService = this._apiServer.settings.apiServer.analyticService;
        
        const header = {  
            headers: new HttpHeaders().set("Authorization", `Bearer ${this._authService.publicToken}`)
        };
        
        this._logging.debug("Request to AnalyticService (postActivity)",bodyActivity);
        
        return this._httpClient.post<any>(analyticService + '/customeractivity', bodyActivity, header)
            .pipe(
                map((response) => {
                    this._logging.debug("Response from AnalyticService (postActivity)",response);

                    return response["data"];
                })
            );
    }
}