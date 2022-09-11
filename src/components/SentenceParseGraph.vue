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

        <div v-if="isSegmentOperationEnabled">
            <SegmentDialog 
                v-for="(word, index) in currentSpacyFormatSentence.words"
                :token="word"
                :index="index"
                :config="config"
                :key="index">
            </SegmentDialog>
        </div>

        <!-- 譯文區 -->
        <div>
            <span
                v-for='(token, index) in currentSpacyFormatSentence.words'
                :key='index'
                class='translated'
                >
                <span
                    v-if='token.translationHelper && token.translationHelper.isTargetPatternConfirmed'
                    >
                    <SegmentTranslation
                        :token='token'
                        >
                    </SegmentTranslation>
                </span>
            </span>
        </div>

    </div>
</template>

<script>
import DependencyEdge from "./DependencyEdge.vue";
import DependencyNode from "./DependencyNode.vue";
import { mapGetters, useStore } from 'vuex'
import { computed, provide, watch } from 'vue'

import SegmentDialog from "@/components/SegmentDialog.vue"
import SegmentTranslation from './SegmentTranslation.vue'

import spacyFormatManager from "@/composables/spacyFormatManager"
import sourcePatternLogic from '@/composables/sourcePatternManager'
import sentenceManager from '@/composables/sentenceManager'
import * as documentPersistence from '@/composables/document/document-persistence'

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
        , ...mapGetters({ 
            currentSentenceIndex: 'currentSentenceIndex'
        })
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
        , SegmentDialog
        , SegmentTranslation
    } 
    , setup(props) {

        const {
            spacyFormatHelper
        } = spacyFormatManager()
        
        const {
            spacyFormatSentences
            , currentSentence
        } = sentenceManager()

        // TODO 變數名稱待調整
        const { sourcePatternManager } = sourcePatternLogic(currentSentence)

        provide('spacyFormatSentences', spacyFormatSentences)
        provide('sourcePattern', sourcePatternManager)
        provide('currentSentence', currentSentence)

        const isSegmentOperationEnabled = computed( () => {
            return props.spacyFormatParseProvider.name
        })

        const processParseResult = (document) => {
            spacyFormatHelper.value.documentParse = document.parse // 文件的 id 可以從這裡開始取
            const sentences = spacyFormatHelper.value.generateSentences(document.parse)
            spacyFormatSentences.push(...sentences)
        }
        const store = useStore()
        const originalText = computed(() => store.state.originalText)
        // 這裡是大部分流程的起頭
        watch(originalText, 
            async (newText) => {
                documentPersistence.retrieveDocument(
                    newText
                    , props.spacyFormatParseProvider.name
                    , props.spacyFormatParseProvider
                    )
                .then(processParseResult)
            }
        )
    
        return {
            spacyFormatHelper
            , spacyFormatSentences
            , isSegmentOperationEnabled
        }
    }
    , provide() {
        return {
            config: this.config
        }
    }
}
</script>
<style>
    @import '../../node_modules/primevue/resources/themes/bootstrap4-dark-blue/theme.css';
    @import '../../node_modules/primevue/resources/primevue.css';
    @import '../../node_modules/primeicons/primeicons.css';

    span.optional {
        color: gray;
    }
    span.translated {
        color: white;
    }
</style>
