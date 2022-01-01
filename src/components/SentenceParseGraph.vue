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
import * as gremlinApi from "@/composables/gremlinManager"

const contentProperty = 'content'
const rawParseProperty = 'rawParse'

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
        async originalText (newText) {
            this.documentText = newText
            this.spacyFormatParseProvider.parse(this.documentText).then(this.processParseResult)
        }
    }
    , methods: {
        async queryExistingParse(documentText) {

            let gremlinInvoke = new gremlinApi.GremlinInvoke()

            gremlinInvoke
            .V()
            .has('content', new gremlinApi.GremlinInvoke(true).call('textFuzzy', documentText))

            return await gremlinApi.submit(gremlinInvoke).then( (resultData) => {
                const queryResult = resultData[gremlinApi.valueKey]
                console.log(queryResult)
                console.log(queryResult.length)
                if (queryResult.length > 1) {
                    const error = '查詢結果有多筆，資料不正確'
                    console.error(error)
                    throw error
                }
                if (queryResult.length <= 0) {
                    return undefined
                }
                // 以下就是查詢結果剛好有 1 筆的正常流程
                console.log(queryResult[0][gremlinApi.valueKey][gremlinApi.keys.properties][contentProperty][0][gremlinApi.keys.value]['value'])
                console.log(queryResult[0][gremlinApi.valueKey][gremlinApi.keys.properties][rawParseProperty][0][gremlinApi.keys.value]['value'])
                return queryResult[0][gremlinApi.valueKey]
            }).catch( (error) => {
                console.error(error)
                throw error
            })
        }
        , processParseResult(spacyFormatParsedResult) {
            this.spacyFormatHelper.documentParse = spacyFormatParsedResult
            const sentences = this.spacyFormatHelper.generateSentences()
            this.spacyFormatSentences.push(...sentences)
            if (this.spacyFormatParseProvider.name != undefined) {
                console.log('parse provider name: ', this.spacyFormatParseProvider.name)
                let gremlinInvoke = new gremlinApi.GremlinInvoke()

                gremlinInvoke
                .addV(gremlinApi.vertexLabels.document)
                .property('content', this.documentText)
                .property('rawParse', JSON.stringify(spacyFormatParsedResult))

                gremlinApi.submit(gremlinInvoke)
            }
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
            type: Object
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

        let documentText = undefined
        return {
            spacyFormatHelper
            , spacyFormatSentences
            , documentText
        }
    }
    , provide() {
        return {
            config: this.config
        }
    }
}
</script>