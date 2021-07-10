<template>
    <div v-if="isParsedContentReady">
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:lang="en"
            id="displacy-svg" class="displacy" :width="width" :height="height" 
            :viewbox="viewbox" :data-format="config.format"
            :style="{color: config.foregroundColor, background: config.backgroundColor, fontFamily: config.fontFamily}" 
            preserveAspectRatio="xMinYMax meet">
            <DependencyNode v-for="(word, index) in spacyFormatHelper.sentenceParse.words" :word="word" :index="index" :key="index"></DependencyNode>
            <DependencyEdge v-for="arc in spacyFormatHelper.sentenceParse.arcs" :arc="arc" :key="arc.key"></DependencyEdge>
        </svg>
        <PatternDialog></PatternDialog>
    </div>
</template>

<script>
import DependencyEdge from "./DependencyEdge.vue";
import DependencyNode from "./DependencyNode.vue";
import { mapState } from 'vuex'
import { provide } from 'vue'
import PatternDialog from "./PatternDialog.vue"
import selectionManager from "@/composables/selectionManager"
import spacyFormatManager from "@/composables/spacyFormatManager"

export default {
    data() {
        return {
            // 這個變數最主要的特點是，每家的 dependency graph 都有自己一份（相對於 spacySentences 是統一一份的）
            selectedDependencyIndices: []
            , spacyFormatSentences: []
        }
    }
    , computed: {
        levels: function() {
            return this.spacyFormatHelper.sentenceParse.words === undefined ? [] : [...new Set(this.spacyFormatHelper.sentenceParse.arcs.map(({ end, start }) => end - start).sort((a, b) => a - b))]
        }
        , highestLevel: function() {
            return this.levels.indexOf(this.levels.slice(-1)[0]) + 1
        } 
        , width: function() {
            return this.spacyFormatHelper.sentenceParse.words === undefined ? 0 : this.config.offsetX + this.spacyFormatHelper.sentenceParse.words.length * this.config.distance
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
            return this.spacyFormatHelper.sentenceParse.words !== undefined && this.spacyFormatSentences.length > 0
        }
        , ...mapState({
            originalText: 'originalText'
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
                this.spacyFormatSentences = sentences
            })
        }
        , toggleDependencyIndexSelected(dependencyIndex) {
            const indexOfDependencyIndex = this.selectedDependencyIndices.indexOf(dependencyIndex)
            if (indexOfDependencyIndex >= 0) {
                this.selectedDependencyIndices.splice(indexOfDependencyIndex, 1)
            } else {
                this.selectedDependencyIndices.push(dependencyIndex)
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
            posSelectionManager
            , lemmaSelectionManager
            , dependencySelectionManager
            , selectionHelper
        } = selectionManager()

        provide('posSelectionManager', posSelectionManager)
        provide('lemmaSelectionManager', lemmaSelectionManager)
        provide('dependencySelectionManager', dependencySelectionManager)
        provide('selectionHelper', selectionHelper)

        const {
            spacyFormatHelper
        } = spacyFormatManager()

        return {
            spacyFormatHelper
        }
    }
    , provide() {
        return {
            config: this.config
        }
    }
}
</script>