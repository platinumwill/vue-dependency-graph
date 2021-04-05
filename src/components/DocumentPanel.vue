<template>
    <div v-if="isDocumentReady">
        <div>
            <DocumentWord v-for="(word, index) in documentParse.words" :word="word" :key="index" :wordIndex="index" :sentence="documentParse.spacy_sents[sentenceIndex]"></DocumentWord>
        </div>
        <div>
            <Button label="<" @click="previousSentence"/>
            <Button label=">" @click="nextSentence"/>
        </div>
    </div>
</template>

<script>
import DocumentWord from "./DocumentWord.vue"
import { mapGetters } from 'vuex'
import Button from 'primevue/button'

export default {
    data() {
        return {
            sentenceIndex: 0
            // PROGRESS: sentenceIndex
        }
    }
    , computed: {
        ...mapGetters([
            'documentParse'
            , 'isDocumentReady'
            , 'maxSentenceIndex'
        ])
    }
    , methods: {
        nextSentence() {
            this.shiftSentence(1)
        }
        , previousSentence() {
            this.shiftSentence(-1)
        }
        , shiftSentence(offset) {
            if (!this.isDocumentReady) {
                return
            }
            const newIndex = this.sentenceIndex + offset
            if (newIndex > this.maxSentenceIndex) {
                return
            }
            if (newIndex < 0) {
                return
            }
            this.sentenceIndex = newIndex
        }
    }
    , components: {
        DocumentWord
        , Button
    }
}
</script>
