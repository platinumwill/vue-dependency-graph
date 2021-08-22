<template>
    <tspan :class="{'morph-info-beginning': isBeginning}" @click="posClicked" :dy="dy" :fill="color" :x="$parent.x"><slot></slot></tspan>
</template>

<script>
import { mapGetters } from 'vuex'
import { morphologyInfoTypeEnum } from "@/composables/morphologyInfo"

export default {
    name: 'TokenInfo'
    , inject: [
        'config'
        , 'tokenIndex'
        , 'spacyFormatSentences'
        , 'patternManager'
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
            type: Object
        }
    }
    , data() {
        return {
        }
    }
    , methods: {
        posClicked: function() {
            this.patternManager.toggleMorphologyInfoSelection(this.morphologyInfoType, this.token)
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
            return this.currentSpacyWord.selectedMorphologyInfoTypes.includes(this.morphologyInfoType)
        }
        , matchExisting: function() {
            return this.token.sourcePatternVertexId !== undefined && this.selected
        }
        , isBeginning: function() {
            return this.currentSpacyWord.isBeginning && this.morphologyInfoType == this.morphologyInfoTypeEnum.pos
        }
        , currentSpacyWord: function() {
            return this.spacyFormatSentences[this.currentSentenceIndex].words[this.token.indexInSentence]
        }
    }
    , setup() {
        return {
            morphologyInfoTypeEnum
        }
    }
}
</script>

<style>
    .morph-info-beginning {
        text-decoration: underline;
    }
</style>
