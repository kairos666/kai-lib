import { Component, h, Element, Prop, Watch } from '@stencil/core';

@Component({
    tag: 'kai-accordion',
    styleUrl: 'kai-accordion.css',
    shadow: false,
    scoped: true
})
export class Accordion {
    @Prop() ariaHidden:boolean; 
    @Element() elt: HTMLElement;

    render() {
        return (
            <slot />
        );
    }

    componentDidLoad() {
        // force collapse as initial state
        if(this.ariaHidden) {
            this.collapseSection(this.elt, true);
        }
    }

    @Watch('ariaHidden')
    onTrigger(newValue:boolean):void {
        if (newValue) {
            this.collapseSection(this.elt);
        } else {
            this.expandSection(this.elt);
        }
    }

    // https://css-tricks.com/using-css-transitions-auto-dimensions/#article-header-id-5
    private collapseSection(element, isInstant?:boolean) {
        // get the height of the element's inner content, regardless of its actual size
        let sectionHeight = element.scrollHeight;
        
        // temporarily disable all css transitions
        let elementTransition = element.style.transition;
        element.style.transition = '';
        
        // on the next frame (as soon as the previous style change has taken effect),
        // explicitly set the element's height to its current pixel height, so we 
        // aren't transitioning out of 'auto'
        const callback = () => {
            element.style.height = sectionHeight + 'px';
            element.style.transition = (!isInstant) ? elementTransition : 'none';
            
            // on the next frame (as soon as the previous style change has taken effect),
            // have the element transition to height: 0
            requestAnimationFrame(() => {
                element.style.height = 0 + 'px';

                // replace original transition after instant collapse
                if (isInstant) {
                    requestAnimationFrame(() => {
                        element.style.transition = elementTransition;
                    });
                }
            });
        }
        requestAnimationFrame(callback);
    }

    private expandSection(element) {
        // get the height of the element's inner content, regardless of its actual size
        let sectionHeight = element.scrollHeight;

        // when the next css transition finishes (which should be the one we just triggered)
        const callback = () => {
            // remove this event listener so it only gets triggered once
            element.removeEventListener('transitionend', callback);
            
            // remove "height" from the element's inline styles, so it can return to its initial value
            element.style.height = null;
        };
        element.addEventListener('transitionend', callback);
        
        // have the element transition to the height of its inner content
        element.style.height = sectionHeight + 'px';
    }
}
