const express = require('express');
const bodyParder = require('body-parser');
const graphqlHttp = require('express-graphql');
const { buildSchema } = require('graphql'); 
const mongoose = require('mongoose');
const Event = require('./models/event');
const User = require('./models/user');
const app = express();
const bcrypt = require('bcryptjs');

app.use(bodyParder.json());

app.use('/graphql', graphqlHttp({
    schema: buildSchema(`
        type Event {
            _id: ID!
            title: String!
            description: String!
            print: Float!
            date: String!
            creator: User!
        }

        type User {
            _id: ID!
            email: String!
            password: String
            createdEvents: [Event!]
        }

        input UserInput {
            email: String!
            password: String!
        }

        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        type RootQuery {
            events: [Event!]!
        }

        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }

        schema {
            query: RootQuery 
            mutation: RootMutation
        }
    `),
    rootValue: {
        events: () => {
            return Event.find()
                .populate('creator')
                .then(events => {
                    return events.map(event => {
                        return {...event._doc, _id: event.id}
                    });
                })
                .catch( err => {
                    throw err;
                });
        },
        createEvent: (args) => {
            const event = new Event({
                title: args.eventInput.title,
                description: args.eventInput.description,
                price: +args.eventInput.price,
                date: new Date(args.eventInput.date),
                creator: '5d53247a91930f7a357f4a23'
            });
            let createdEvents;
            return event
            .save()
            .then(result => {
                createdEvents = {...result._doc, _id: result._doc._id.toString()}
                return User.findById('5d53247a91930f7a357f4a23')
            })
            .then(user => {
                if (!user) {
                    throw new Error('User not found');
                }
                user.createdEvents.push(event);
                return user.save();
            })
            .then(result => {
                return createdEvents;
            })
            .catch(err => {
                console.log(err) 
                throw err;
            })
        },
        createUser: (args) => {
            return User.findOne({email: args.userInput.email}).then(user => {
                if (user) {
                    throw new Error('User exists')
                }
                return bcrypt
                .hash(args.userInput.password, 12)
            })
            .then(hashedPassword => {
                    const user = new User({
                        email: args.userInput.email,
                        password: hashedPassword
                    });
                    return user.save();
                })
                .then(result => {
                    return {...result._doc, password: null, id: result.id}
                })
                .catch( err => {
                    throw err;
                });
        }
    },
    graphiql: true
}));

mongoose.connect(
    `mongodb+srv://${process.env.MONGO_USER}:${
        process.env.MONGO_PASSWORD
    }@cluster0-1zkr8.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`
    ).then(() => {
        app.listen(3000);
    }).catch( err => {
        console.log(err);
    });

