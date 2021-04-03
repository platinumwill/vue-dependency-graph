<template>
    <div>
        <span class="currentSentence">fdfad</span><span class="document">11111</span>
        <span class="document">{{ documentParse }}</span>
    </div>
</template>

<script>
import { mapGetters } from 'vuex'
export default {
    computed: {
        ...mapGetters([
            'documentParse'
        ])
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