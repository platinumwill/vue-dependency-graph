<template>
    <text class="displacy-token" fill="currentColor" text-anchor="middle" :y="y">
        <tspan class="displacy-word" fill="currentColor" :x="x">{{ word.text }}</tspan>
        <tspan class="displacy-lemma" dy="2em" fill="currentColor" :x="x">{{ word.lemma }}</tspan>
        <tspan class="displacy-tag" dy="2em" :fill="color" :x="x" @click="posClicked">{{ word.tag }}</tspan>
    </text>
</template>

<script>
export default {
    name: 'DependencyeNode'
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
}
</script>