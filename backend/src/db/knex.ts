import knexFactory from 'knex'
import config from '../../knexfile.js'

const knex = knexFactory(config)

export default knex
