<template>
    <div v-if="isParsedContentReady && isDocumentReady">
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:lang="en"
            id="displacy-svg" class="displacy" :width="width" :height="height" 
            :viewbox="viewbox" :data-format="config.format"
            :style="{color: config.foregroundColor, background: config.backgroundColor, fontFamily: config.fontFamily}" 
            preserveAspectRatio="xMinYMax meet">
            <DependencyNode v-for="(word, index) in sentenceParse.words" :word="word" :index="index" :key="index" :config="config"></DependencyNode>
            <DependencyEdge v-for="arc in sentenceParse.arcs" :arc="arc" :key="arc.key" :config="config"></DependencyEdge>
        </svg>
        <PatternDialog></PatternDialog>
    </div>
</template>

<script>
import DependencyEdge from "./DependencyEdge.vue";
import DependencyNode from "./DependencyNode.vue";
import { mapGetters } from 'vuex'
import PatternDialog from "./PatternDialog.vue"

export default {
    data() {
        return {
            spacyFormatDocumentParse: undefined
        }
    }
    , computed: {
        levels: function() {
            return this.spacyFormatDocumentParse === undefined ? [] : [...new Set(this.spacyFormatDocumentParse.arcs.map(({ end, start }) => end - start).sort((a, b) => a - b))]
        }
        , highestLevel: function() {
            return this.levels.indexOf(this.levels.slice(-1)[0]) + 1
        } 
        , width: function() {
            return this.spacyFormatDocumentParse === undefined ? 0 : this.config.offsetX + this.spacyFormatDocumentParse.words.length * this.config.distance
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
            return this.spacyFormatDocumentParse !== undefined
        }
        , sentenceParse: function() {
            if (this.spacyFormatDocumentParse === undefined || !this.$store.getters.isDocumentReady) {
                return {}
            }
            const filteredArcs = this.spacyFormatDocumentParse.arcs.filter(
                arc =>
                arc.start >= this.currentSentence.start 
                && arc.end >= this.currentSentence.start
                && arc.start < this.currentSentence.end 
                && arc.end < this.currentSentence.end 
                )
            let arcsClone = JSON.parse(JSON.stringify(filteredArcs.slice(0)))
            arcsClone.forEach(function (arc) {
                arc.start -= (this.currentSentence.start)
                arc.end -= (this.currentSentence.start)
            }, this)
            const sentenceParse = {
                words: this.spacyFormatDocumentParse.words.filter(
                (word, index) =>
                    index >= this.currentSentence.start 
                    && index < this.currentSentence.end
                )
                , arcs: arcsClone
            }
            return sentenceParse
        }
        , ...mapGetters({ 
            isDocumentReady: 'isDocumentReady'
            , isGoogleParseReady: 'isGoogleParseReady'
            , originalText: 'originalText'
            , currentSentence: 'currentSentence'
        })
    }
    , watch: {
        originalText (newText) {
            this.delegateToSpacyAgent(newText)
        }
    }
    , methods: {
        async delegateToSpacyAgent(documentText) {
            await this.spacyFormatParseProvider(documentText).then((spacyFormatParsedResult) => {
                this.spacyFormatDocumentParse = spacyFormatParsedResult
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
}
</script>