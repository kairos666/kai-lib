import { Component, h, Prop, Element, State } from '@stencil/core';
import { generateUid } from '../../utils/utils';

@Component({
    tag: 'kai-carousel',
    styleUrl: 'kai-carousel.css',
    shadow: false,
    scoped: false
})
export class Carousel {
    @Element() elt:HTMLElement;
    @Prop() carouselTitle!:string;
    @Prop() autoplay:boolean;
    @Prop() cycle:boolean;
    @Prop() delay:number = 5000; // ms delay between each slide transitions
    @Prop() transition:number = 500 // ms transition time between slides
    @State() currentSlideIndex:number = 0;
    @State() currentSlideTotal:number = 0;
    private uid:string = generateUid().toString();
    private interval; // autoplay interval
    private mutationObserver:MutationObserver;
    private carouselBodyElt:HTMLElement;

    componentWillLoad() {
        if (!MutationObserver) return null;

        // hack for binded functions
        this.mutationHandler = this.mutationHandler.bind(this);
        this.slideTransitionHandler = this.slideTransitionHandler.bind(this);

        // set up observer
        this.mutationObserver = new MutationObserver(this.mutationHandler);
    }

    componentDidLoad() {
        if (!this.mutationObserver) return null;
        
        // observe
        this.carouselBodyElt = this.elt.querySelector('.kai-Carousel_BodyInner');
        this.mutationObserver.observe(this.carouselBodyElt, { childList: true, attributes: false, subtree: false });

        // initial render
        this.mutationHandler();
        if(this.autoplay) this.interval = setInterval(() => {
            this.slideTransitionHandler('next', false);
        }, this.delay);
    }

    componentDidUnload() {
        // disconnect observer
        this.mutationObserver.disconnect();

        // clear interval
        if(this.interval) clearInterval(this.interval);
    }

    render() {
        return (
            <section class="kai-Carousel" aria-labelledby={ `kai-Carousel_Heading-${ this.uid }` }>
                <h3 id={ `kai-Carousel_Heading-${ this.uid }` } class="sr-only">{ this.carouselTitle }</h3>
                <div class="kai-Carousel_Body">
                    <div class="kai-Carousel_BodyInner" style={ this.dynamicStyles() }>
                        <slot/>
                    </div>
                </div>
                <footer>
                    <button type="button" class="kai-Carousel_Paging kai-Carousel_Paging-previous" onClick={ () => this.slideTransitionHandler('previous') } disabled={ (!this.cycle && this.currentSlideIndex == 0) }><slot name="previous-button" /></button>
                    <button type="button" class="kai-Carousel_Paging kai-Carousel_Paging-next" onClick={ () => this.slideTransitionHandler('next') } disabled={ (!this.cycle && this.currentSlideIndex == this.currentSlideTotal - 1) }><slot name="next-button" /></button>
                    { this.renderPagingList() }
                </footer>
            </section>
        );
    }

    renderPagingList() {
        const pagingTempArray = new Array(this.currentSlideTotal).fill(0);

        return (
            <ol class="kai-Carousel_PagingList">
                {pagingTempArray.map((_item, index) => {
                    // the active slide button is the one disabled
                    return <button type="button" class='kai-Carousel_PagingListButton' disabled={ (this.currentSlideIndex == index) } onClick={ () => this.slideTransitionHandler(index) }>{ index + 1 }</button>
                })}
            </ol>
        );
    }

    mutationHandler(_mutationsList?:MutationRecord[], _observer?:MutationObserver) {
        this.currentSlideTotal = this.carouselBodyElt.childElementCount;
        if (this.currentSlideIndex >= this.currentSlideTotal) this.currentSlideIndex = this.currentSlideTotal - 1;
    }

    slideTransitionHandler(transitionTo:'previous'|'next'|number, stopAutoplay:boolean = true) {
        switch(transitionTo) {
            case 'previous': this._currentSlideIndex = this.currentSlideIndex - 1; break;
            case 'next': this._currentSlideIndex = this.currentSlideIndex + 1; break;
            default:
                // move directly to given index
                this._currentSlideIndex = transitionTo;
        }

        if(stopAutoplay && this.autoplay && this.interval) {
            // stop autoplay if needed (user interaction)
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    set _currentSlideIndex(newSlideIndex:number) {
        const indexMaxedOut = (newSlideIndex >= this.currentSlideTotal);
        const indexMinedOut = (newSlideIndex < 0);

        if(indexMaxedOut && this.interval && !this.cycle) {
            // stop autoplay if needed (non cycling and reached the end)
            clearInterval(this.interval);
            this.interval = null;
        }

        if((indexMaxedOut && this.cycle) || (indexMinedOut && !this.cycle)) {
            // cycle to beginning OR  stop at the beginning
            this.currentSlideIndex = 0;
        } else if((indexMaxedOut && !this.cycle) || (indexMinedOut && this.cycle)) {
            // stop at the end OR cycle to end
            this.currentSlideIndex = this.currentSlideTotal - 1;
        } else {
            // apply without modification
            this.currentSlideIndex = newSlideIndex;
        }
    }

    dynamicStyles():any {
        // apply animation between slides and handle wich one is currently seen
        return {
            transition: `transform ${this.transition}ms ease`,
            transform: `translateX(-${this.currentSlideIndex * 100}%)`
        }
    }
}