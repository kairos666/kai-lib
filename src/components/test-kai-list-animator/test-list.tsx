import { Component, h, State } from '@stencil/core';

@Component({
    tag: 'test-list',
    shadow: false,
    scoped: false
})
export class TestList {
    private renderFunc = function(_props) {
        return (<section>item { _props.index }</section>)
    }
    @State() items:any[] = [
        { index: 1, otherKey: 'A' },
        { index: 2, otherKey: 'B' },
        { index: 3, otherKey: 'C' },
        { index: 4, otherKey: 'D' },
        { index: 5, otherKey: 'E' },
        { index: 6, otherKey: 'F' }
    ]

    render() {
        return [
            <button type="button" onClick={ this.onClickHandler.bind(this) }>random list</button>,
            <kai-list-animator 
                renderItemFunc={ this.renderFunc }
                items={ this.items }
                key="index"
                animName="slide-fade"
                staggering={ 150 }
            ></kai-list-animator>
        ];
    }

    private onClickHandler() {
        const itemCount = Math.round(Math.random() * 9 + 1);
        const newitems = Array(itemCount).fill(null).map((_item, index) => {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            return { index: index + 1, otherKey: characters.charAt(index) };
        });

        // shuffle items - enable when handling ordering
        /**
         * Shuffles array in place. ES6 version
         * @param {Array} a items An array containing the items.
         */
        // function shuffle(a) {
        //     for (let i = a.length - 1; i > 0; i--) {
        //         const j = Math.floor(Math.random() * (i + 1));
        //         [a[i], a[j]] = [a[j], a[i]];
        //     }
        //     return a;
        // }

        this.items = newitems;
    }
}