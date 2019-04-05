import { Component, Prop, State, Watch, Element } from '@stencil/core';

/**
 * &lt;KAI-IMG&gt;
 * ===============
 * 
 * replace [&lt;img&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) tag
 * Accepts all attributes that a regular img tag would (ignoring deprecated ones).
 * - Add customized loading and broken display to any image
 * - async loading image after page is fully loading (better performance in first paint)
 * - (optionnal) async loading when element is in the visible part of the viewport
 * 
 * Sample
 * ------
 * ```
 * <kai-img src="https://picsum.photos/200/200/?image=500" alt="cached image"></kai-img>
 * ```
 * 
 * Know limitations
 * ----------------
 * - can't specify custom HTML for loading and broken placeholders. You can still style them though.
 * - not optimal for srcset settings because the browser act as a black box and we don't know which image source will be applied beforehand.
 * - <kai-img> can't be self closing tag like <img> because it is not allowed by CustomElements specs
 */
@Component({
  tag: 'kai-img',
  styleUrl: 'kai-img.css',
  shadow: false,
  scoped: true
})
export class Img {
    /** used for visible async loading behavior */
    private intersectionObserver:IntersectionObserver;
    /** same as [&lt;img&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) tag attribute (required) */
    @Prop() src!:string;
    /** same as [&lt;img&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) tag attribute */
    @Prop() srcset:string;
    /** same as [&lt;img&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) tag attribute (optional only when used as pure decorational image, otherwise you should always have one) */
    @Prop() alt:string;
    /** same as [&lt;img&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) tag attribute */
    @Prop() decoding:'sync'|'async'|'auto';
    /** same as [&lt;img&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) tag attribute */
    @Prop() width:string;
    /** same as [&lt;img&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) tag attribute */
    @Prop() height:string;
    /** same as [&lt;img&gt;](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) tag attribute */
    @Prop() sizes:string;
    /** flag for toggling on/off the visble async loading behavior when off the default behavior is async loading after page is fully loaded */
    @Prop() visibleAsyncLoading:boolean = false;
    /** generated DOMString from a fetched image */
    @State() private innerSrc:string;
    /** flag for marking an error in fetching image */
    @State() private isBroken:boolean = false;
    /** DOM Element used as target for intersectionObserver */
    @Element() private kaiImg:Element;

    /**
     * Based on component state, it will render either the image itself, or the loading state, or the broken state
     */
    render() {
        const renderedEl = (this.innerSrc) ? (
            <img src={this.innerSrc} alt={this.alt} width={this.width} height={this.height} sizes={this.sizes} srcset={this.srcset} decoding={this.decoding} />
        ) : (this.isBroken) ? (
            <span class="kai-Img kai-Img-broken" style={this.infoDynamicStyles()}>
                <span>broken image</span>
                <span>{this.alt}</span>
            </span>
        ) : (
            <span class="kai-Img kai-Img-loading" style={this.infoDynamicStyles()}>
                <span class="kai-Ellipsis"><span></span><span></span><span></span><span></span></span>
                <span>{this.alt}</span>
            </span>
        )
        return renderedEl;
    }

    /**
     * When initiated the component check if a "src" attribute was provided then depending on the situation do one of this 3 possible actions
     * 1. load and insert the image in the DOM (cf. [[srcSwapHandler]])
     * 2. listen for document load event and then execute action 1.
     * 3. observe the element is visible event and then execute action 2.
     */
    componentDidLoad() {
        // checks for at least "src" ("alt" is not necessary if only used for decoration)
        if (!this.src) {
            console.warn('kai-img | a src is required');
            this.isBroken = true;
        } else if(!this.visibleAsyncLoading || !('IntersectionObserver' in window)) {
            // async load when browser is available (not waiting for element to be visible in viewport)
            const docState = document.readyState.toString();
            if (docState === 'loaded' || docState === 'interactive' || docState === 'complete') {
                // page is fully loaded
                this.srcSwapHandler(this.src);
            } else {
                // wait for the page to be fully loaded
                window.addEventListener('load', () => {
                    this.srcSwapHandler(this.src);
                });
            }
        } else {
            // async load when browser is available (waiting for element to be visible in viewport)
            // default is according to viewport and as soon as the first pixel is visible
            this.intersectionObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // element is visible - but yet we make sure that the rest of the page is loaded
                        const docState = document.readyState.toString();
                        if (docState === 'loaded' || docState === 'interactive' || docState === 'complete') {
                            // page is fully loaded
                            this.srcSwapHandler(this.src);
                        } else {
                            // wait for the page to be fully loaded
                            window.addEventListener('load', () => {
                                this.srcSwapHandler(this.src);
                            });
                        }
                        observer.disconnect();
                    }
                });
            });
            this.intersectionObserver.observe(this.kaiImg);
        }
    }

    /**
     * Component destroy function
     */
    componentDidUnload() {
        // cleanup observer if needed
        if (this.intersectionObserver) this.intersectionObserver.disconnect();
    }

    /**
     * Calculate dynamic inline styles to be applied on the component tag (both width and height must be provided as attributes otherwise no styles are applied)
     */
    private infoDynamicStyles() {
        return (this.width && this.height) ? {
            width: `${this.width}px`,
            height: `${this.height}px`
        } : {}
    }

    /**
     * This handler performs a fetch request then pass directly the response to the <img> tag that will be generated at rerender.
     * This handler is called at component instanciation and each time the src attribute is updated
     * @param srcURL the provided "src" attribute for the custom tag
     */
    @Watch('src')
    private srcSwapHandler(srcURL:string) {
        // first fetch the image (browser put it in cache)
        if (fetch) {
            fetch(srcURL)
            .then(response => {
                return response.blob();
            })
            .then(responseBlob => {
                return URL.createObjectURL(responseBlob);
            })
            .then(responseBlobObjectURL => {
                // then add src set that will use that response directly
                this.isBroken = false;
                this.innerSrc = responseBlobObjectURL;
            })
            .catch(() => {
                // if image can't be fetched
                this.isBroken = true;
                this.innerSrc = undefined;
            });
        } else {
            // just go through for older browsers without fetch API
            this.isBroken = false;
            this.innerSrc = srcURL;
        }
    }
}