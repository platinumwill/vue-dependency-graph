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
        posClicked: async function() {
            // this.morphologyInfo.token.translationHelper.toggleMorphologyInfoSelection(this.morphologyInfo)
            if (!this.morphologyInfo.token.translationHelper) {
                const targetPatternHelper = targetPattern.prepareTargetPattern(this.morphologyInfo.token)
                this.morphologyInfo.token.setTagetpatternHelper(targetPatternHelper)

                const segmentHelper = sourcePattern.prepareSegment(this.morphologyInfo.token)
                this.morphologyInfo.token.setSegmentHelper(segmentHelper)

                const helper = await translationHelper.prepareTranslationHelper(segmentHelper, targetPatternHelper)
                this.morphologyInfo.token.setTranslationHelper(helper)
            }
            await this.morphologyInfo.token.translationHelper.toggleMorphologyInfoSelection(this.morphologyInfo)
        }
    }
    , computed: {
        color: function() {
            if (this.initialTranslationConfirmed) {
                return 'grey'
            } else if (this.matchExisting) {
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
        , initialTranslationConfirmed: function() {
            return this.morphologyInfo.token.translationHelper 
                && this.morphologyInfo.token.translationHelper.isTargetPatternConfirmed
                && this.selected
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
