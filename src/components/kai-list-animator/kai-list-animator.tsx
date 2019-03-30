import { Component, Prop, State, Watch, Element } from '@stencil/core';
import differenceWith from 'lodash/differenceWith';
import get from 'lodash/get';

interface IDiffItem {
    itemTransition: 'none'|'insertion'|'deletion';
    item: any;
    key: string;
    animWrapperClasses?: string;
    animDelayStyle?: string;
}

enum CSSAnimClasses {
    ENTER = '-enter',
    ENTER_ACTIVE = '-enter-active',
    ENTER_TO = '-enter-to',
    LEAVE = '-leave',
    LEAVE_ACTIVE = '-leave-active',
    LEAVE_TO = '-leave-to'
}

@Component({
    tag: 'kai-list-animator',
    styleUrl: 'kai-list-animator.css',
    shadow: false,
    scoped: true
})
export class ListAnimator {
    @Element() elt:HTMLElement;
    @Prop() renderItemFunc!:(any) => JSX.Element;
    @Prop() items!:any[]; // items to show
    @Prop() key!:string;
    @Prop() animName!:string;
    @Prop() noFirstRenderAnimation?:boolean;
    @Prop() staggering?:number; // delay between concurrent item animations (default - no staggering)
    @State() _items:IDiffItem[]; // items actually shown
    private currentDiffArray:IDiffItem[];
    private hasDeletedItems:boolean = false;
    private hasAddedItems:boolean = false;
    private runningInsertionAnimationCount:number = 0;
    private runningDeletionAnimationCount:number = 0;
    private currentDiffState:'initial'|'initial-pending-end'|'mid'|'mid-pending-end'|'end'; // no state = end state
    private isDebug:boolean = false;

    componentWillLoad() {
        // initial items sync
        this.onItemsUpdate(this.items, []);
    }

    @Watch('items')
    onItemsUpdate(newValue, oldValue):void {
        // evaluate items diff
        this.currentDiffArray = this.calculateItemsDiff(newValue, oldValue);

        // anim state (by pass initial state if no items are deleted)
        this.currentDiffState = (this.hasDeletedItems) ? 'initial' : 'mid';

        // curate list for starting animations
        this._items = this.getCuratedItems();
        if (this.isDebug) console.log('item list updated | state:', this.currentDiffState, this.currentDiffArray);
    }

    componentDidLoad() {
        // first list render
        if (!this.noFirstRenderAnimation) {
            // static first list render
            this.currentDiffState = 'end';
            this._items = this.getCuratedItems();
        } else {
            // animate first list render
            this.componentDidUpdate();
        }
    }

    componentDidUpdate() {
        switch(this.currentDiffState) {
            case 'initial':
                // rendered initial state - launch deletion
                this.currentDiffState = 'initial-pending-end';
                window.requestAnimationFrame(this.initialNextFrameUpdate.bind(this));

                break;
            case 'mid':
                // rendered mid state - launch insertions
                this.currentDiffState = 'mid-pending-end';
                window.requestAnimationFrame(this.midNextFrameUpdate.bind(this));

                break;
            case 'initial-pending-end':
                if (this.isDebug) console.log('LEAVE ANIMATING START | state:', this.currentDiffState, this.currentDiffArray);
                break;
            case 'mid-pending-end':
                if (this.isDebug) console.log('ENTER ANIMATING START | state:', this.currentDiffState, this.currentDiffArray);
                break;
            default:
                // nothing to do, DOM is automatically cleaned up
                if (this.isDebug) console.log('FINISHED ANIMATING LIST | state:', this.currentDiffState, this.currentDiffArray);
        }
    }

    render() {
        return (
            <ul>
                {   this._items.map(item => (
                        <li class={ item.animWrapperClasses } style={ item.animDelayStyle ? {transitionDelay: item.animDelayStyle} : null }>
                            { this.renderItemFunc(item.item) }
                        </li>
                    ))
                }
            </ul>
        )
    }

    private calculateItemsDiff(newValue, oldValue):IDiffItem[] {
        let deletedItems:any[], addedItems:any[];

        // added or deleted elements - quick comparison with provided key
        deletedItems = differenceWith(oldValue, newValue, (a, b) => (get(a, this.key, null) === get(b, this.key, null)));
        addedItems = differenceWith(newValue, oldValue, (a, b) => (get(a, this.key, null) === get(b, this.key, null)));

        // reset animations counters
        this.runningDeletionAnimationCount = this.runningInsertionAnimationCount = 0;

        // update markers for lifecycle
        this.hasDeletedItems = (deletedItems.length !== 0);
        this.hasAddedItems = (addedItems.length !== 0);

        const diffArray = newValue.map(item => {
            let newItemTransition = (addedItems.includes(item)) ? 'insertion' : 'none';

            return { itemTransition: newItemTransition, item: item, key: get(item, this.key, null) };
        });
        
        // inject old values that should be deleted
        deletedItems
            .map(item => {
                return { itemTransition: 'deletion', item: item, key: get(item, this.key, null) };
            })
            .forEach(item => {
                diffArray.splice(oldValue.indexOf(item.item), 0, item);
            });

        return diffArray;
    }

    private getCuratedItems():IDiffItem[] {
        const diffArray = this.currentDiffArray;

        switch(this.currentDiffState) {
            case 'initial':
                const diffArrayWithoutInsertions = diffArray.filter(item => (item.itemTransition !== 'insertion'));
                const diffArrayOnlyDeletions = diffArrayWithoutInsertions.filter(item => (item.itemTransition == 'deletion'));
                return diffArrayWithoutInsertions.map(item => {
                        if (item.itemTransition === 'deletion') {
                            // calculate classes and delay for deleted elements
                            item.animWrapperClasses = `${this.animName + CSSAnimClasses.LEAVE_ACTIVE} ${this.animName + CSSAnimClasses.LEAVE}`;
                            if (this.staggering) {
                                const deletionIndex = diffArrayOnlyDeletions.findIndex(_item => (_item === item));
                                item.animDelayStyle = (this.staggering) ? `${this.staggering * deletionIndex}ms` : null;
                            }
                        }

                        return item;
                    });
            case 'mid':
                const diffArrayWithoutDeletions = diffArray.filter(item => (item.itemTransition !== 'deletion'));
                const diffArrayOnlyInsertions = diffArrayWithoutDeletions.filter(item => (item.itemTransition == 'insertion'));
                return diffArrayWithoutDeletions.map(item => {
                        if (item.itemTransition === 'insertion') {
                            // calculate classes and delay for inserted elements
                            item.animWrapperClasses = `${this.animName + CSSAnimClasses.ENTER_ACTIVE} ${this.animName + CSSAnimClasses.ENTER}`;
                            if (this.staggering) {
                                const deletionIndex = diffArrayOnlyInsertions.findIndex(_item => (_item === item));
                                item.animDelayStyle = (this.staggering) ? `${this.staggering * deletionIndex}ms` : null;
                            }
                        }

                        return item;
                    });
            case 'end':
            default:
                return diffArray
                    .filter(item => (item.itemTransition !== 'deletion')).map(item => {
                        if (item.animWrapperClasses) item.animWrapperClasses = undefined;

                        return item;
                    });
        }
    }

    private initialNextFrameUpdate():void {
        const initialNextDiffArray = this.currentDiffArray.filter(item => (item.itemTransition !== 'insertion')).map(item => {
            if (item.itemTransition === 'deletion') {
                item.animWrapperClasses = `${this.animName + CSSAnimClasses.LEAVE_ACTIVE} ${this.animName + CSSAnimClasses.LEAVE_TO}`;
                this.runningDeletionAnimationCount++;
            }

            return item;
        });

        // listen to leave animation end
        const deletedDOMItemsCollection = this.elt.querySelectorAll(`.${this.animName + CSSAnimClasses.LEAVE_ACTIVE}`);
        if (this.isDebug) console.log(`animating ${ deletedDOMItemsCollection.length } LEAVE elements`);
        Array.from(deletedDOMItemsCollection).forEach(domElt => {
            const transitionEndFunc = () => {
                this.runningDeletionAnimationCount--;

                if (this.runningDeletionAnimationCount === 0) {
                    // anim state (bypass mid state if no items are added)
                    this.currentDiffState = (this.hasAddedItems) ? 'mid' : 'end';

                    this._items = this.getCuratedItems();
                    if (this.isDebug) console.log('all LEAVE animations have ended | state:', this.currentDiffState, this.currentDiffArray);
                }

                domElt.removeEventListener('transitionend', transitionEndFunc);
            };

            domElt.addEventListener('transitionend', transitionEndFunc);
        });

        this._items = initialNextDiffArray;
        if (this.isDebug) console.log('state:', this.currentDiffState, this.currentDiffArray);
    }

    private midNextFrameUpdate():void {
        const midNextDiffArray = this.currentDiffArray.filter(item => (item.itemTransition !== 'deletion')).map(item => {
            if (item.itemTransition === 'insertion') {
                item.animWrapperClasses = `${this.animName + CSSAnimClasses.ENTER_ACTIVE} ${this.animName + CSSAnimClasses.ENTER_TO}`;
                this.runningInsertionAnimationCount++;
            }

            return item;
        });

        // listen to leave animation end
        const addedDOMItemsCollection = this.elt.querySelectorAll(`.${this.animName + CSSAnimClasses.ENTER_ACTIVE}`);
        if (this.isDebug) console.log(`animating ${ addedDOMItemsCollection.length } ENTER elements`);
        Array.from(addedDOMItemsCollection).forEach(domElt => {
            const transitionEndFunc = () => {
                this.runningInsertionAnimationCount--;

                if (this.runningInsertionAnimationCount === 0) {
                    this.currentDiffState = 'end';
                    this._items = this.getCuratedItems();
                    if (this.isDebug) console.log('all ENTER animations have ended | state:', this.currentDiffState, this.currentDiffArray);
                }

                domElt.removeEventListener('transitionend', transitionEndFunc);
            };

            domElt.addEventListener('transitionend', transitionEndFunc);
        });

        this._items = midNextDiffArray;
        if (this.isDebug) console.log('state:', this.currentDiffState, this.currentDiffArray);
    }
}