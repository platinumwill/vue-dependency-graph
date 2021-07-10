<template>
    <span :class="sentenceClass">{{ sentence.text }} &nbsp;</span>
</template>


<script>
import { mapGetters } from "vuex"
export default {
    computed: {
        sentenceClass: function() {
            if (this.sentenceIndex === this.currentSentenceIndex) {
                return 'currentSentence'
            }
            return 'document' 
        }
        , ...mapGetters({
            currentSentenceIndex: 'currentSentenceIndex'
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