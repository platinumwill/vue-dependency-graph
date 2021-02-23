<template>
    <text class="displacy-token" fill="currentColor" text-anchor="middle" :y="y">
        <tspan class="displacy-word" fill="currentColor" :x="x">{{ word.text }}</tspan>
        <TokenInfo :dy="'2em'">{{ word.lemma }}</TokenInfo>
        <TokenInfo :dy="'2em'">{{ word.tag }}</TokenInfo>
    </text>
</template>

<script>
import TokenInfo from "./TokenInfo.vue";

export default {
    name: 'DependencyeNode'
    , components: {
        TokenInfo
    } 
    , props: {
        config: {
            type: Object
            , default: function() {}
        }
        , word: {
            type: Object
        }
        , index: {
            type: Number
        }
    }
    , data() {
        return {
            selected: false
        }
    }
    , computed: {
        y: function() {
          return this.$parent.offsetY + this.$parent.config.wordSpacing  
        } 
        , x: function() {
            return this.$parent.config.offsetX  + this.index * this.$parent.config.distance
        }
        , color: function() {
            return this.selected ? this.config.selectedForegroundColor : 'currentColor'
        }
    }
    , methods: {
        posClicked: function(event) {
            this.selected = !this.selected
            console.log(event)
        }
    }
    , provide() {
        return {
            tokenIndex: this.index
            , config: this.config
        }
    }
}
</script>