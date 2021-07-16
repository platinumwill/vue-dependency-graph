<template>
    <tspan :class="{'morph-info-beginning': isBeginning}" @click="posClicked" :dy="dy" :fill="color" :x="$parent.x"><slot></slot></tspan>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
    name: 'TokenInfo'
    , inject: [
        'config'
        , 'tokenIndex'
        , 'toggleMorphologySelection'
        , 'spacyFormatSentences'
        ]
    , props: {
        dy: {
            type: String
            , default: ''
        }
        , token: {
            type: Object
        }
        , morphologyInfoType: {
            type: String
        }
    }
    , data() {
        return {
        }
    }
    , methods: {
        posClicked: function() {
            this.toggleMorphologySelection(this.morphologyInfoType, this.token.indexInSentence)
        }
    }
    , computed: {
        color: function() {
            return this.selected ? this.config.selectedForegroundColor : 'currentColor'
        }
        , ...mapGetters({ 
            currentSentenceIndex: 'currentSentenceIndex'
        })
        , selected: function() {
            return this.spacyFormatSentences[this.currentSentenceIndex].words[this.token.indexInSentence].selectedMorphologyInfoType === this.morphologyInfoType
        }
        , isBeginning: function() {
            return this.spacyFormatSentences[this.currentSentenceIndex].words[this.token.indexInSentence].beginningMorphologyInfoType === this.morphologyInfoType
        }
    }
}
</script>

<style>
    .morph-info-beginning {
        text-decoration: underline;
    }
</style>
