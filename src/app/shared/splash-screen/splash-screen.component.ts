import { Component, Input, OnInit } from "@angular/core";
import { SplashAnimation } from "./splash-animation.type";

@Component({
    selector   : 'splash-screen',
    templateUrl: './splash-screen.component.html',
    styleUrls  : ['./splash-screen.component.scss']
})
export class SplashScreenComponent implements OnInit {
    windowWidth: string;
    splashTransition: string;
    opacityChange: number = 1;
    showSplash = true;

    @Input() animationDuration: number = 0.5;
    @Input() duration: number = 3;
    @Input() animationType: SplashAnimation = SplashAnimation.SlideLeft;
    
    /**
     * Constructor
     */
    constructor()
    {
    }
  
    ngOnInit(): void {
        setTimeout(() => {
            let transitionStyle = "";
            switch (this.animationType) {
                case SplashAnimation.SlideLeft:
                    this.windowWidth = "-" + window.innerWidth + "px";
                    transitionStyle = "left " + this.animationDuration + "s";
                    break;
                case SplashAnimation.SlideRight:
                    this.windowWidth = window.innerWidth + "px";
                    transitionStyle = "left " + this.animationDuration + "s";
                    break;
                case SplashAnimation.FadeOut:
                    transitionStyle = "opacity " + this.animationDuration + "s";
                    this.opacityChange = 0;
            }
  
            this.splashTransition = transitionStyle;
  
            setTimeout(() => {
            this.showSplash = !this.showSplash;
            }, this.animationDuration * 1000);
            
        }, this.duration * 1000);
    }
}