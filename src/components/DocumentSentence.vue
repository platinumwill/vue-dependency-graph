<template>
    <span :class="sentenceClass">{{ sentence.text }} &nbsp;</span>
</template>


<script>
import { mapState } from "vuex"
export default {
    computed: {
        sentenceClass: function() {
            if (this.sentenceIndex === this.currentSentenceIndex) {
                return 'currentSentence'
            }
            return 'document' 
        }
        , ...mapState({
            currentSentenceIndex: state => state.newSentenceNavigator.currentSentenceIndex
        })
    }
    , props: [
        'sentence'
        , 'sentenceIndex'
    ]
}
</script>

<style>
span.currentSentence {
    color: red;
}
span.document {
    color: gray;
}
</style>