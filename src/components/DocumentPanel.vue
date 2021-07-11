<template>
    <div v-if="isDocumentReady">
        <div>
            <DocumentSentence v-for="(sentence, index) in baselineSentences" :sentence="sentence" :key="index" :sentenceIndex="index"></DocumentSentence>
        </div>
        <div>
            <Button label="<" @click="previousSentence" :disabled="previousSentenceButtonDisabled" />
            <Button label=">" @click="nextSentence" :disabled="nextSentenceButtonDisabled" />
        </div>
    </div>
</template>

<script>
import DocumentSentence from "./DocumentSentence.vue"
import { mapGetters, mapMutations } from 'vuex'
import Button from 'primevue/button'

export default {
    computed: {
        nextSentenceButtonDisabled: function() {
            if (this.currentSentenceIndex >= this.maxSentenceIndex) {
                return true
            }
            return false
        }
        , previousSentenceButtonDisabled: function() {
            if (this.currentSentenceIndex <= 0) {
                return true
            }
            return false
        }
        , ...mapGetters({ 
            isDocumentReady: 'isDocumentReady'
            , maxSentenceIndex: 'maxSentenceIndex'
            , currentSentenceIndex: 'currentSentenceIndex'
            , baselineSentences: 'baselineSentences'
         })
    }
    , methods: {
        nextSentence() {
            this.shiftSentence(1)
        }
        , previousSentence() {
            this.shiftSentence(-1)
        }
        , ...mapMutations({
            shiftSentence: 'sentenceNavigator/shiftSentence'
        })
    }
    , components: {
        DocumentSentence
        , Button
    }
}
</script>
