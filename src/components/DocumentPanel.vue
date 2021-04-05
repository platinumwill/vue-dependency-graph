<template>
    <div v-if="isDocumentReady">
        <div>
            <DocumentWord v-for="(word, index) in documentParse.words" :word="word" :key="index" :wordIndex="index" :sentence="documentParse.spacy_sents[currentSentenceIndex]"></DocumentWord>
        </div>
        <div>
            <Button label="<" @click="previousSentence" :disabled="previousSentenceButtonDisabled" />
            <Button label=">" @click="nextSentence" :disabled="nextSentenceButtonDisabled" />
        </div>
    </div>
</template>

<script>
import DocumentWord from "./DocumentWord.vue"
import { mapGetters, mapMutations } from 'vuex'
import Button from 'primevue/button'

export default {
    computed: {
        nextSentenceButtonDisabled: function() {
            if (!this.isDocumentReady) {
                return true
            }
            if (this.currentSentenceIndex >= this.maxSentenceIndex) {
                return true
            }
            return false
        }
        , previousSentenceButtonDisabled: function() {
            if (!this.isDocumentReady) {
                return true
            }
            if (this.currentSentenceIndex <= 0) {
                return true
            }
            return false
        }
        , ...mapGetters([
            'documentParse'
            , 'isDocumentReady'
            , 'maxSentenceIndex'
            , 'currentSentenceIndex'
        ])
    }
    , methods: {
        nextSentence() {
            this.shiftSentence(1)
        }
        , previousSentence() {
            this.shiftSentence(-1)
        }
        , ...mapMutations(['shiftSentence'])
    }
    , components: {
        DocumentWord
        , Button
    }
}
</script>
