<template>
    <div v-if="isParsedContentReady">
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:lang="en"
            id="displacy-svg" class="displacy" :width="width" :height="height" 
            :viewbox="viewbox" :data-format="config.format"
            :style="{color: config.foregroundColor, background: config.backgroundColor, fontFamily: config.fontFamily}" 
            preserveAspectRatio="xMinYMax meet">
            <DependencyNode v-for="(word, index) in currentSpacyFormatSentence.words" :word="word" :index="index" :key="index"></DependencyNode>
            <DependencyEdge v-for="arc in currentSpacyFormatSentence.arcs" :arc="arc" :key="arc.key"></DependencyEdge>
        </svg>
        <PatternDialog></PatternDialog>
    </div>
</template>

<script>
import DependencyEdge from "./DependencyEdge.vue";
import DependencyNode from "./DependencyNode.vue";
import { mapGetters, mapState } from 'vuex'
import { provide } from 'vue'
import PatternDialog from "./PatternDialog.vue"

import spacyFormatManager from "@/composables/spacyFormatManager"
import targetPatternPieceManager from '@/composables/targetPatternPieceManager'
import sourcePatternLogic from '@/composables/sourcePatternManager'
import sentenceManager from '@/composables/sentenceManager'
import patternLogic from '@/composables/patternLogic'

export default {
    data() {
        return {
        }
    }
    , computed: {
        levels: function() {
            return [...new Set(this.currentSpacyFormatSentence.arcs
                .map(({ end, start }) => end - start)
                .sort((a, b) => a - b))]
        }
        , highestLevel: function() {
            return this.levels.indexOf(this.levels.slice(-1)[0]) + 1
        } 
        , width: function() {
            return this.config.offsetX + this.currentSpacyFormatSentence.words.length * this.config.distance
        }
        , height: function() {
            return this.offsetY + 3 * this.config.wordSpacing
        } 
        , viewbox: function() {
            return "0 0 " + this.width + " " + this.height
        }
        , offsetY: function() {
            return this.config.distance / 2 * this.highestLevel
        }
        , isParsedContentReady() {
            return this.spacyFormatSentences.length > 0
            && this.currentSpacyFormatSentence.words !== undefined
            && this.currentSpacyFormatSentence.words.length > 0
        }
        , currentSpacyFormatSentence() {
            return this.spacyFormatSentences[this.currentSentenceIndex]
        }
        , ...mapState({
            originalText: 'originalText'
        })
        , ...mapGetters({ 
            currentSentenceIndex: 'currentSentenceIndex'
        })
    }
    , watch: {
        // 這裡是大部分流程的起頭
        originalText (newText) {
            this.delegateToSpaceFormatParserProvider(newText)
        }
    }
    , methods: {
        async delegateToSpaceFormatParserProvider(documentText) {
            await this.spacyFormatParseProvider(documentText).then((spacyFormatParsedResult) => {
                this.spacyFormatHelper.documentParse = spacyFormatParsedResult
                const sentences = this.spacyFormatHelper.generateSentences()
                this.spacyFormatSentences.push(...sentences)
            })
        }
    }
    , props: {
        config: {
            type: Object
            , default: function() {
                return {
                    distance: 200
                    , offsetX: 50
                    , arrowSpacing: 20
                    , arrowStroke: 2
                    , wordSpacing: 75
                    , format: 'spacy'
                    , foregroundColor: '#ff0000'
                    , selectedForegroundColor: '#00ff00'
                    , backgroundColor: '#000000'
                    , fontFamily:'inherit' 
                    , arrowWidth: 10 
                }
            }
        }
        , spacyFormatParseProvider: {
            type: Function
        }
    }
    , components: {
        DependencyEdge
        , DependencyNode
        , PatternDialog
    } 
    , setup() {

        const {
            spacyFormatHelper
        } = spacyFormatManager()
        
        const {
            spacyFormatSentences
            , currentSentence
        } = sentenceManager()

        // TODO 變數名稱待調整
        const { targetPattern } = targetPatternPieceManager(currentSentence)
        const { sourcePatternManager } = sourcePatternLogic(currentSentence)
        const { patternManager } = patternLogic(sourcePatternManager, targetPattern, currentSentence)

        provide('spacyFormatSentences', spacyFormatSentences)
        provide('sourcePattern', sourcePatternManager)
        provide('targetPattern', targetPattern)
        provide('currentSentence', currentSentence)
        provide('patternManager', patternManager)

        return {
            spacyFormatHelper
            , spacyFormatSentences
        }
    }
    , provide() {
        return {
            config: this.config
        }
    }
}
</script>