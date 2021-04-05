<template>
    <span :class="wordClass">{{ word.text }} &nbsp;</span>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
    computed: {
        wordClass: function() {
            if (this.wordIndex < this.sentence.start -1 || this.wordIndex >= this.sentence.end - 1) {
                return 'document'
            }
            return 'currentSentence' 
        }
        , ...mapGetters([
            'documentParse'
        ])
    }
    , props: ['word', 'wordIndex', 'sentence']
}
</script>

<style>
span.currentSentence {
    color: green
}
span.document {
    color: white;
}
</style>