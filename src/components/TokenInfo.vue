<template>
    <tspan class="displacy-lemma" @click="posClicked" :dy="dy" :fill="color" :x="$parent.x"><slot></slot></tspan>
</template>

<script>
import { mapState } from 'vuex'

export default {
    name: 'TokenInfo'
    , inject: ['config', 'tokenIndex']
    , props: {
        dy: {
            type: String
            , default: ''
        }
        , selectionManager: {
            type: Object
        }
        , token: {
            type: Object
        }
    }
    , data() {
        return {
        }
    }
    , methods: {
        posClicked: function() {
            this.selectionManager.toggler(this.token.indexInSentence)
        }
    }
    , computed: {
        color: function() {
            return this.selected ? this.config.selectedForegroundColor : 'currentColor'
        }
        , ...mapState({ 
            currentSentenceIndex: state => state.sentenceNavigator.currentSentenceIndex
             })
        , selected: function() {
            return this.selectionManager.selections.indexOf(this.token.indexInSentence) >= 0
        }

    }
}
</script>