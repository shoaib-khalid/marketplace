import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, of, Subject, throwError } from 'rxjs';
import { catchError, concatMap, delay, retry, retryWhen, takeUntil } from 'rxjs/operators';
import { JwtService } from 'app/core/jwt/jwt.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { DeviceDetectorService } from 'ngx-device-detector';
import { AuthService } from './auth/auth.service';
import { IpAddressService } from './ip-address/ip-address.service';
import { Router } from '@angular/router';
import { AnalyticService } from './analytic/analytic.service';
import { CartService } from './cart/cart.service';
import { DisplayErrorService } from './display-error/display-error.service';

export const retryCount = 3;
export const retryDelay = 1000;

@Injectable()
export class CoreInterceptor implements HttpInterceptor
{
    ipAddress  : string;
    deviceInfo = null;
    _event     : string;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _fuseConfirmationService: FuseConfirmationService,
        private _displayErrorService: DisplayErrorService,
        private _jwtService: JwtService,
        private _deviceService: DeviceDetectorService,
        private _ipAddressService: IpAddressService,
        private _authService: AuthService,
        private _analyticService: AnalyticService,
        private _cartService: CartService,
        private _router: Router,
    )
    {
        // Get User IP Address
        this._ipAddressService.ipAdressInfo$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((response:any)=>{
                if (response) {
                    this.ipAddress = response.ip_addr;                
                }
            });

        this._router.events.forEach((event) => {
            this._event = event["urlAfterRedirects"]
        })
    }

    /**
     * Intercept
     *
     * @param req
     * @param next
     */
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>>
    {
        // Clone the request object
        let newReq = req.clone();
        
        // Response
        return next.handle(newReq).pipe(

            retryWhen(error => 
                error.pipe(
                  concatMap((error, count) => {

                    // set show error 500 page to false
                    this._displayErrorService.hide();

                    const substring =  String(error.status)[0]
                    
                    // retry 'retryCount' amount of times
                    if (count < retryCount && error instanceof HttpErrorResponse && (substring === '5' || error.status === 0)) {
                        return of(error);
                    }

                    // when already retried 'retryCount' amount of times
                    else if (count === retryCount) {
                        // set show error 500 page to true
                        this._displayErrorService.show({title: "Internal Server Error", code: error.status , message: error.message, type: '5xx', aftereffect: 'reload'});
                    }
                    // Ignore intercept for login () clients/authenticate                
                    else if ( error instanceof HttpErrorResponse && !(error.status === 401 && newReq.url.indexOf("customers/authenticate") > -1)  && !(error.status === 409) && !(error.status === 200) && !(error.status === 417) && !(error.status === 404) && !(error.status === 403))
                    {
                        // Show a error message
                        const confirmation = this._fuseConfirmationService.open({
                            title  : error.error.error ? 'Error ' + error.error.error + ' (' + error.error.status + ')': 'Error',
                            message: error.error.message ? error.error.message : error.message,
                            icon: {
                                show: true,
                                name: "heroicons_outline:exclamation",
                                color: "warn"
                            },
                            actions: {
                                confirm: {
                                    label: 'OK',
                                    color: "primary",
                                },
                                cancel: {
                                    show: false,
                                },
                            }
                        });

                        //--------------------------------------------
                        //post customer activity if there is any error
                        //-------------------------------------------- 

                        // get storeId
                        // var _storeId = this.store.id;

                        // if customerId null means guest
                        let _customerId = this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid ? this._jwtService.getJwtPayload(this._authService.jwtAccessToken).uid : null

                        //get device info (browser info, os info, device nodel infp)
                        var device = this._deviceService.getDeviceInfo();
                        let _deviceBrowser = device.browser + ' ' + device.browser_version
                        let _deviceOs = device.os_version
                        let _deviceModel = device.deviceType + ' ' + device.device
                        
                        //get ip address info
                        var _IpService = this.ipAddress;

                        //get session id by get cart id
                        var _sessionId = null // this._cartService.cartId$ 

                        const activityBody = 
                        {
                            browserType : _deviceBrowser,
                            customerId  : _customerId? _customerId :null,
                            deviceModel : _deviceModel,
                            errorOccur  : "error " + error.error.error,
                            errorType   : "error " + error.error.status,
                            ip          : _IpService,
                            os          : _deviceOs,
                            pageVisited : this._event,
                            sessionId   : _sessionId,
                            storeId     : null,
                            latitude    : null,
                            longitude   : null,
                            // address     : null,
                            // postcode    : null,
                            // city        : null,
                            // state       : null,
                            // country     : null,
                        }

                        this._analyticService.postActivity(activityBody)
                            .subscribe((response) => {
                            });
                        
                    }
                    
                    return throwError(error);
                  }),

                  // delay the retry
                  delay(retryDelay)
                )
            ),
        );
    }
}
