<template>
    <text class="displacy-token" fill="currentColor" text-anchor="middle" :y="y">
        <tspan class="displacy-word" fill="currentColor" :x="x">{{ word.text }}</tspan>
        <TokenInfo :token="word" :selectedIndices="selectedLemmaIndices" :toggleSelectionAction="toggleLemmaSelected" :dy="'2em'">{{ word.lemma }}</TokenInfo>
        <TokenInfo :token="word" :selectedIndices="selectedPOSIndices" :toggleSelectionAction="togglePOSSelected" :dy="'2em'">{{ word.tag }}</TokenInfo>
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
        word: {
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
    , provide() {
        return {
            tokenIndex: this.index
        }
    }
    , inject: [
        'config'
        , 'selectedPOSIndices'
        , 'selectedLemmaIndices'
        , 'togglePOSSelected'
        , 'toggleLemmaSelected'
    ]
}
</script>