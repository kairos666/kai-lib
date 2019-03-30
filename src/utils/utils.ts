export class BouncySphere {
    private domElt:HTMLElement;
    private vx:number;
    private vy:number;
    private rot:number; // degrees
    private px:number;
    private py:number;
    private prot:number;
    private width:number;
    private height:number;
    private lastUpdateHighResTimeStamp:number;
    private requestAnimationIdentification:number;
    private stillFrameCounter   = 0;
    static MAXSTILLFRAMECOUNT:number = 30;
    static INITIAL:number       = 10.0;
    static GRAVITY:number       =  0.2;
    static REBOUND_RATIO:number =  0.8;
    static DAMPING_RATIO:number =  0.995;

    constructor(domElt:HTMLElement) {
        this.domElt = domElt;

        // extract elment characteristics
        const boundingRect = this.domElt.getBoundingClientRect();
        this.px = boundingRect.left;
        this.py = boundingRect.top;
        this.width = boundingRect.right - boundingRect.left;
        this.height = boundingRect.bottom - boundingRect.top;
        this.prot = this.getElementRotation(this.domElt);

        // origin of time
        this.lastUpdateHighResTimeStamp = performance.now();

        // apply initial force
        this.vx = Math.random()* BouncySphere.INITIAL * 2 - BouncySphere.INITIAL;
        this.vy = Math.random()* BouncySphere.INITIAL * 2 - BouncySphere.INITIAL;
        this.rot = Math.random()* BouncySphere.INITIAL * 2 - BouncySphere.INITIAL;

        // initial animation frame callback
        this.requestAnimationIdentification = window.requestAnimationFrame(this.updatePosition.bind(this));
    }

    public destroy() {
        if(this.requestAnimationIdentification) window.cancelAnimationFrame(this.requestAnimationIdentification);
        this.domElt.remove();
    }

    private updatePosition(timestamp:DOMHighResTimeStamp):void {
        // elapsed time and update last update timestamp
        const elapsedTime = timestamp - this.lastUpdateHighResTimeStamp;
        const accelerationRatioThroughTime = elapsedTime / 16;
        this.lastUpdateHighResTimeStamp = timestamp;

        // collision state(heuristic)
        const viewPortWidth = window.innerWidth;
        const viewPortHeight = window.innerHeight;
        const collisionState = this.collisionDetection(viewPortWidth, viewPortHeight);
        switch(collisionState) {
            case 'left':
                this.px = 0
                this.vx *= -BouncySphere.REBOUND_RATIO;
            break;
            case 'right':
                this.px = viewPortWidth - this.width;
                this.vx *= -BouncySphere.REBOUND_RATIO;
            break;
            case 'top':
                this.py = 0
                this.vy *= -BouncySphere.REBOUND_RATIO;
            break;
            case 'bottom':
                this.py = viewPortHeight - this.height;
                this.vy *= -BouncySphere.REBOUND_RATIO;
                this.rot = 360 * this.vx * (elapsedTime/100) / this.width * Math.PI;
            break;
        }

        // apply damping
        this.vx *= BouncySphere.DAMPING_RATIO;
        this.vy *= BouncySphere.DAMPING_RATIO;

        // apply gravity
        this.vy += BouncySphere.GRAVITY;

        // update element
        const oldPx = Math.round(this.px);
        const oldPy = Math.round(this.py);
        const oldProt = Math.round(this.prot);
        this.px += this.vx * accelerationRatioThroughTime;
        this.py += this.vy * accelerationRatioThroughTime;
        this.prot += this.rot * accelerationRatioThroughTime;
        const newPx = Math.round(this.px);
        const newPy = Math.round(this.py);
        const newProt = Math.round(this.prot);
        if (oldPx !== newPx) this.domElt.style.left = newPx + 'px';
        if (oldPy !== newPy) this.domElt.style.top = newPy + 'px';
        if (oldProt !== newProt) this.domElt.style.transform = `rotate(${newProt}deg)`;
        if ((oldPx === newPx) && (oldPy === newPy)) this.stillFrameCounter++;

        // next animation frame
        if (this.stillFrameCounter <= BouncySphere.MAXSTILLFRAMECOUNT) {
            this.requestAnimationIdentification = window.requestAnimationFrame(this.updatePosition.bind(this));
        } else {
            this.requestAnimationIdentification = undefined;
        }
    }

    private collisionDetection(viewPortWidth:number, viewPortHeight:number):'left'|'right'|'top'|'bottom'|'none' {
        return (this.px + this.vx < 0)
            ? 'left'
            : (this.px + this.width + this.vx > viewPortWidth)
            ? 'right'
            : (this.py + this.vy < 0)
            ? 'top'
            : (this.py + this.height + this.vy > viewPortHeight)
            ? 'bottom'
            : 'none';
    }

    private getElementRotation(elt:HTMLElement):number {
        // https://css-tricks.com/get-value-of-css-rotation-through-javascript/
        const st = window.getComputedStyle(elt, null);
        const tr =  st.getPropertyValue("-webkit-transform") ||
                    st.getPropertyValue("-moz-transform") ||
                    st.getPropertyValue("-ms-transform") ||
                    st.getPropertyValue("-o-transform") ||
                    st.getPropertyValue("transform") ||
                    "fail...";
        let angle:number;
        if( tr !== "none") {
            let values:string|string[] = tr.split('(')[1];
                values = values.split(')')[0];
                values = values.split(',');
            const a = parseFloat(values[0]);
            const b = parseFloat(values[1]);
            // const c = values[2]; // unused
            // const d = values[3]; // unused
        
            angle = Math.round(Math.atan2(b, a) * (180/Math.PI));
        }

        return angle || 0;
    }
}

export class BouncySphereController {
    private eltsIdentifierClass:string = 'aprils-fool-elt';
    private bouncingObjects:BouncySphere[] = [];
    
    contructor() {
        // setup konamic code listener
    }

    // private triggerEventsBinding():void {

    // }

    private generateObject(evt:MouseEvent):void {
        // random characteristics
        const radius:number = Math.random()*150 + 70;
        const originPx:number = evt.pageX - radius/2;
        const originPy:number = evt.pageY - radius/2;
  
        // build new element
        const newObject = document.createElement("div");
        newObject.style.left = originPx + 'px';
        newObject.style.top = originPy + 'px';
        newObject.style.width = radius/2 + 'px';
        newObject.style.height = radius/2 + 'px';
        newObject.classList.add(this.eltsIdentifierClass);
  
        // apply to DOM and launch behavior
        document.body.appendChild(newObject);
        this.bouncingObjects.push(new BouncySphere(newObject));
    }

    private addStyleSheet(targetClass:string):void {
        const style = document.createElement("style");
        style.type = 'text/css';

        const css:string = `.${ targetClass } { 
            border-radius: 50%; 
            background: transparent no-repeat url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNS4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiIFsNCgk8IUVOVElUWSBuc19mbG93cyAiaHR0cDovL25zLmFkb2JlLmNvbS9GbG93cy8xLjAvIj4NCl0+DQo8c3ZnIHZlcnNpb249IjEuMSINCgkgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeG1sbnM6YT0iaHR0cDovL25zLmFkb2JlLmNvbS9BZG9iZVNWR1ZpZXdlckV4dGVuc2lvbnMvMy4wLyINCgkgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSIxMDBweCIgaGVpZ2h0PSIxMDBweCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDEwMCAxMDAiIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGRlZnM+DQo8L2RlZnM+DQo8Y2lyY2xlIGZpbGw9IiNFRDhGMjIiIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIvPg0KPGNpcmNsZSBmaWxsPSIjRUU3ODIzIiBjeD0iMjYuMjAxIiBjeT0iMTguMjkyIiByPSIzLjg4MiIvPg0KPGNpcmNsZSBmaWxsPSIjRUU3ODIzIiBjeD0iNDEuNzYxIiBjeT0iMTAuNTMxIiByPSIzLjg4MiIvPg0KPGNpcmNsZSBmaWxsPSIjRUU3ODIzIiBjeD0iODYuMjY5IiBjeT0iMzQuMTA1IiByPSIzLjg4MiIvPg0KPGNpcmNsZSBmaWxsPSIjRUU3ODIzIiBjeD0iNzQuMzIzIiBjeT0iNDYuMTUzIiByPSIzLjg4MiIvPg0KPGNpcmNsZSBmaWxsPSIjRUU3ODIzIiBjeD0iOTAuMTQ5IiBjeT0iNTEuMDU3IiByPSIzLjg4MiIvPg0KPGNpcmNsZSBmaWxsPSIjRUU3ODIzIiBjeD0iODUuNyIgY3k9IjY3LjMyNSIgcj0iMy44ODEiLz4NCjxjaXJjbGUgZmlsbD0iI0VFNzgyMyIgY3g9IjcxLjgzIiBjeT0iNjAuNzExIiByPSIzLjg4MSIvPg0KPHBhdGggZmlsbD0iIzlCNjEyNiIgZD0iTTY5Ljg5MiwyMy43MjdjLTAuNzcsMC0xLjUtMC40NjMtMS44MDUtMS4yMjdjLTEuNzk2LTQuNTIzLTguOTI3LTUuNzc1LTguOTk1LTUuNzg3DQoJYy0xLjA1Ny0wLjE3OC0xLjc3MS0xLjE3Ni0xLjU5My0yLjIzM2MwLjE3NC0xLjA1NCwxLjE2OS0xLjc3LDIuMjI2LTEuNTk1YzAuMzgzLDAuMDYyLDkuMzYyLDEuNjEyLDExLjk2OSw4LjE4NQ0KCWMwLjM5NSwwLjk5Ni0wLjA5MiwyLjEyNS0xLjA4NywyLjUyQzcwLjM3NCwyMy42ODQsNzAuMTMyLDIzLjcyNyw2OS44OTIsMjMuNzI3eiIvPg0KPHBhdGggZmlsbD0iIzlCNjEyNiIgZD0iTTYyLjUzNSwyMS44ODZjLTAuNDY1LDAtMC45MzQtMC4xNjYtMS4zMDctMC41MDRjLTAuNzkxLTAuNzIzLTAuODUtMS45NDktMC4xMjktMi43NDINCgljMi4yMTctMi40MzYsNS4wMTgtNC4zMzMsOC4xMDUtNS40OTVjMS4wMDQtMC4zNzIsMi4xMjEsMC4xMzEsMi41LDEuMTM0YzAuMzc1LDEuMDAzLTAuMTMzLDIuMTIzLTEuMTM1LDIuNQ0KCWMtMi41MTQsMC45NDItNC43OTcsMi40OS02LjYsNC40N0M2My41ODgsMjEuNjczLDYzLjA2MywyMS44ODYsNjIuNTM1LDIxLjg4NnoiLz4NCjxwYXRoIGZpbGw9IiM2NTlDNDEiIGQ9Ik02NS41NTMsMTcuMTY4bC05Ljg3Ny0wLjgxM2MtMTAuNDMyLTAuODU4LTIwLjE5NSw1LjIwMy0yNC4wNTUsMTQuOTI4bC0zLjY1Niw5LjIxM2w5Ljg3NiwwLjgxMw0KCWMxMC40MywwLjg1NywyMC4xOTUtNS4yMDUsMjQuMDU2LTE0LjkzMUw2NS41NTMsMTcuMTY4eiIvPg0KPHBhdGggZmlsbD0iIzg4QzA1NyIgZD0iTTMyLjI0NywzNi4xNEM0NC4zOTIsMjQuMjc3LDU3LjU5LDIwLjM4NSw1OS4wMzUsMjAuMjkzIi8+DQo8L3N2Zz4NCg==');
            position: fixed;
            z-index: 666;
            border:3px solid transparent;
            background-size: contain;
            pointer-events: none;
        }`;

        // Add the <style> element to the page
        document.head.appendChild(style);

        // browser support check
        if ((style as any).styleSheet) {
            // IE8-
            (style as any).styleSheet.cssText = css;
        } else {
            // all other browsers
            style.appendChild(document.createTextNode(css));
        }
    }

    public activateEffect():void {
        // generate stylesheet
        this.addStyleSheet(this.eltsIdentifierClass);

        // bind to effect generator event listener
        window.addEventListener('click', this.generateObject.bind(this));
    }

    public deactivateEffect():void {
        // unbind effect generator event listener
        window.removeEventListener('click', this.generateObject.bind(this));
        this.bouncingObjects.forEach(bSphere => {
            bSphere.destroy();
        });
    }
}