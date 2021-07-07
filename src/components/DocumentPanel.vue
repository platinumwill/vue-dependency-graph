<template>
    <div v-if="isDocumentReady">
        <div>
            <DocumentSentence v-for="(sentence, index) in newSentences" :sentence="sentence" :key="index" :sentenceIndex="index"></DocumentSentence>
        </div>
        <div>
            <Button label="<" @click="previousSentence" :disabled="previousSentenceButtonDisabled" />
            <Button label=">" @click="nextSentence" :disabled="nextSentenceButtonDisabled" />
        </div>
    </div>
</template>

<script>
import DocumentSentence from "./DocumentSentence.vue"
import { mapGetters, mapMutations, mapState } from 'vuex'
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
        , ...mapState({ 
            currentSentenceIndex: state => state.currentSentenceIndex
            , newSentences: state => state.newSentenceNavigator.sentences
         })
        , ...mapGetters([
            'isDocumentReady'
            , 'maxSentenceIndex'
        ])
    }
    , methods: {
        nextSentence() {
            this.shiftSentence(1)
            this.shiftNewSentence(1)
        }
        , previousSentence() {
            this.shiftSentence(-1)
            this.shiftNewSentence(-1)
        }
        , ...mapMutations({
            shiftSentence: 'shiftSentence'
            , shiftNewSentence: 'newSentenceNavigator/shiftSentence'
        })
    }
    , components: {
        DocumentSentence
        , Button
    }
}
</script>
