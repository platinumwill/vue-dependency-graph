<template>
    <div>
        <span class="document" v-for="(word, index) in documentParse.words" :key="index">{{ word.text }} &nbsp;</span>
    </div>
    <div>
        <Button label="<" @click="previousSentence"/>
        <Button label=">" @click="nextSentence"/>
    </div>
</template>

<script>
import { mapGetters } from 'vuex'
import Button from 'primevue/button'

export default {
    data() {
        return {
            // PROGRESS: sentenceIndex
        }
    }
    , computed: {
        ...mapGetters([
            'documentParse'
        ])
    }
    , methods: {
        nextSentence() {

        }
        , previousSentence() {

        }
    }
    , components: {
        Button
    }
}
</script>

<style>
span.currentSentence {
    color: yellow
}
span.document {
    color: white;
}
</style>