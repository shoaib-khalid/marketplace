import { Injectable } from '@angular/core';
import { Router, RouterEvent, NavigationEnd } from '@angular/router';

/** A router wrapper, adding extra functions. */
@Injectable({
    providedIn: 'root'
})
export class ShopService {
  
    private previousUrl: string = undefined;
    private currentUrl: string = undefined;

    constructor(
        private _router : Router
    ) {
        this.currentUrl = this._router.url;

        _router.events
            .subscribe(event => {
                if (event instanceof NavigationEnd) {
                    this.previousUrl = this.currentUrl;
                    this.currentUrl = event.url;
                };
            });
    }

    public getPreviousUrl(){
        return this.previousUrl;
    }    
}