import { ChangeDetectorRef, Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { fuseAnimations } from '@fuse/animations';
import { MatDrawer } from '@angular/material/sidenav';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { Subject, takeUntil } from 'rxjs';
import { UserService } from 'app/core/user/user.service';
import { Customer, User } from 'app/core/user/user.types';
import { Platform } from 'app/core/platform/platform.types';
import { PlatformService } from 'app/core/platform/platform.service';
import { Title } from '@angular/platform-browser';


@Component({
    selector     : 'edit-profile-page',
    templateUrl  : './edit-profile.component.html',
    styles       : ['.ql-container { height: 156px; }'],
    encapsulation: ViewEncapsulation.None,
    animations   : fuseAnimations
})
export class EditProfileComponent implements OnInit
{
 
    @ViewChild('drawer') drawer: MatDrawer;
    drawerMode: 'over' | 'side' = 'side';
    drawerOpened: boolean = true;

    panels: any[] = [];
    selectedPanel: string = 'account';
    currentScreenSize: any;
    customer: any;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _userService: UserService,
        private _platformService: PlatformService,
        private _titleService: Title


    )
    {
        // this.checkExistingURL = debounce(this.checkExistingURL, 300);
        // this.checkExistingName = debounce(this.checkExistingName,300);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
       
        // Setup available panels
        this.panels = [
            {
                id         : 'account',
                icon       : 'heroicons_outline:user-circle',
                title      : 'Account',
                description: 'Manage your public profile and private information'
            },
            {
                id         : 'delivery-address',
                icon       : 'heroicons_outline:map',
                title      : 'Delivery Address',
                description: 'Manage and set default delivery address'
            },
            {
                id         : 'security',
                icon       : 'heroicons_outline:lock-closed',
                title      : 'Security',
                description: 'Manage your password'
            },
            {
                id         : 'delete-account',
                icon       : 'mat_outline:delete_forever',
                title      : 'Delete Account',
                description: 'Delete your account'
            }
        ];

        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({matchingAliases}) => {               

                this.currentScreenSize = matchingAliases;
                
                if (this.currentScreenSize.includes('md')) {
                    this.drawerMode = 'side';
                } else if (this.currentScreenSize.includes('sm')) {
                    this.drawerMode = 'over';
                } else {
                    this.drawerMode = 'over';
                }

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        

        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((user: User)=>{

                this.customer = user
                
                // if 'password' doesn't exist in object
                if (!("password" in this.customer)) {
                    // Remove security panel
                    let index = this.panels.findIndex(item => item.id === 'security')
                    if (index > 1) {
                        this.panels.splice(index, 1)
                    }
                }
            });

        this._platformService.platform$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((platform: Platform) => {
                if (platform) {
                    // set title
                    this._titleService.setTitle(platform.name + " | " + "Profile Settings");
                }
    
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
    }

    ngAfterViewInit(): void{
    }

    /**
     * Get the details of the panel
     *
     * @param id
     */
    getPanelInfo(id: string): any
    {
        return this.panels.find(panel => panel.id === id);
    }

    goToPanel(panel: string): void
    {
        this.selectedPanel = panel;

        // Close the drawer on 'over' mode
        if ( this.drawerMode === 'over' )
        {
            this.drawer.close();
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
}