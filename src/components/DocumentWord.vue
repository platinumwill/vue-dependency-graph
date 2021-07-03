<template>
    <span :class="wordClass">{{ word.text }} &nbsp;</span>
</template>

<script>

export default {
    computed: {
        wordClass: function() {
            if (this.wordIndex < this.sentence.start -1 || this.wordIndex >= this.sentence.end) {
                return 'document'
            }
            return 'currentSentence' 
        }
    }
    , props: ['word', 'wordIndex', 'sentence']
}
</script>

<style>
span.currentSentence {
    color: red;
}
span.document {
    color: white;
}
</style>