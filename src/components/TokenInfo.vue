<template>
    <tspan class="displacy-lemma" @click="posClicked" :dy="dy" :fill="color" :x="$parent.x"><slot></slot></tspan>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
    name: 'DependencyLemma'
    , inject: ['config', 'tokenIndex']
    , props: {
        dy: {
            type: String
            , default: ''
        }
    }
    , data() {
        return {
            selected: false
        }
    }
    , methods: {
        posClicked: function() {
            this.selected = !this.selected
        }
    }
    , watch: {
        currentSentenceIndex () {
            this.selected = false
        }
    }
    , computed: {
        color: function() {
            return this.selected ? this.config.selectedForegroundColor : 'currentColor'
        }
        , ...mapGetters([
            'currentSentenceIndex'
            ])

    }
}
</script>