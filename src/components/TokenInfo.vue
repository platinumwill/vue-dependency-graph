<template>
    <tspan :class="{'morph-info-beginning': isBeginning}" @click="posClicked" :dy="dy" :fill="color" :x="$parent.x"><slot></slot></tspan>
</template>

<script>
import { mapGetters } from 'vuex'
import { MorphologyInfo, minimalMorphologyInfo } from "@/composables/morphologyInfo"

import * as translationHelper from '@/composables/translationHelper'
import * as sourcePattern from '@/composables/sourcePatternSegment'
import * as targetPattern from '@/composables/targetPattern'

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
        , morphologyInfo: {
            type: MorphologyInfo
        }
    }
    , data() {
        return {
        }
    }
    , methods: {
        posClicked: function() {
            // this.patternManager.toggleMorphologyInfoSelection(this.morphologyInfo)
            // this.morphologyInfo.token.translationHelper.toggleMorphologyInfoSelection(this.morphologyInfo)
            const targetPatternHelper = targetPattern.prepareTargetPattern(this.morphologyInfo.token)
            const segmentHelper = sourcePattern.prepareSegment(this.morphologyInfo.token)
            const testHelper = translationHelper.prepareTranslationHelper(segmentHelper, targetPatternHelper)
            testHelper.toggleMorphologyInfoSelection(this.morphologyInfo)
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
            return this.currentSpacyWord.selectedMorphologyInfoTypes.includes(this.morphologyInfo.type)
        }
        , matchExisting: function() {
            return this.morphologyInfo.token.sourcePatternVertexId !== undefined && this.selected
        }
        , isBeginning: function() {
            return this.currentSpacyWord.isBeginning && this.morphologyInfo.type == this.minimalMorphologyInfo
        }
        , currentSpacyWord: function() {
            return this.spacyFormatSentences[this.currentSentenceIndex].words[this.morphologyInfo.token.indexInSentence]
        }
    }
    , setup() {
        return {
            minimalMorphologyInfo
        }
    }
}
</script>

<style>
    .morph-info-beginning {
        text-decoration: underline;
    }
</style>
