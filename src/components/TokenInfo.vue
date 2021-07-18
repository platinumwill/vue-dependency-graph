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
            if (this.matchExisting) {
                return "yellow"
            } else if (this.selected) {
                return this.config.selectedForegroundColor 
            }
            return 'currentColor'
        }
        , ...mapGetters({ 
            currentSentenceIndex: 'currentSentenceIndex'
        })
        , selected: function() {
            return this.currentSpacyWord.selectedMorphologyInfoType === this.morphologyInfoType
        }
        , matchExisting: function() {
            return this.token.sourcePatternVertexId !== undefined && this.selected
        }
        , isBeginning: function() {
            return this.currentSpacyWord.beginningMorphologyInfoType === this.morphologyInfoType
        }
        , currentSpacyWord: function() {
            return this.spacyFormatSentences[this.currentSentenceIndex].words[this.token.indexInSentence]
        }
    }
}
</script>

<style>
    .morph-info-beginning {
        text-decoration: underline;
    }
</style>
