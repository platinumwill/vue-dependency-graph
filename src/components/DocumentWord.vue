<template>
    <span class="document">{{ word.text }} &nbsp;</span>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
    computed: {
        ...mapGetters([
            'documentParse'
        ])
    }
    , props: ['word']
}
</script>