<template>
    <text class="displacy-token" fill="currentColor" text-anchor="middle" :y="y">
        <tspan class="displacy-word" fill="currentColor" :x="x">{{ word.text }}</tspan>
        <TokenInfo v-for="(morphologyInfo, index) in morphologyInfoArray"
            :morphologyInfo="morphologyInfo"
            :key="index"
            :dy="'2em'"
            >
            {{ word[morphologyInfo.type.propertyInWord] }}
        </TokenInfo>
    </text>
</template>

<script>
import TokenInfo from "./TokenInfo.vue"
import { MorphologyInfo, morphologyInfoTypeEnum } from "@/composables/morphologyInfo"

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
    ]
    , setup(props) {

        const morphologyInfoArray = [];
        for (const property in morphologyInfoTypeEnum) {
            const morphologyInfo = new MorphologyInfo(props.word, morphologyInfoTypeEnum[property])
            morphologyInfoArray.push(morphologyInfo)
        }

        return {
            morphologyInfoArray
        }
    }
}
</script>