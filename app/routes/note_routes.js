const ObjectID = require('mongodb').ObjectID;

module.exports = function (app, db, upload) {
    app.post('/user', (req, res) => {
        let result = req.body;
        let newUser = createNewUser(result);
        const query = {$or: [{email: result.email}, {userName: result.userName}]};
        db.collection('users').findOne(query)
            .then((itemEmail) => {
                res.send(itemEmail);
            }, (error) => {
                res.send({'error': 'There`s account with this email!'});
            });
    });

    app.post('/auth', (req, res) => {
        let result = req.body;
        const user = {email: result.email};
        db.collection('users').findOne(user, (error, itemUser) => {
            if (error) {
                res.send({'error': 'An error has occurred'});
            } else {
                if (itemUser) {
                    itemUser.status = 'online';
                    itemUser.lastSeen = new Date().toJSON();
                    db.collection('users').updateOne(user, itemUser, (err, resultUpd) => {
                        if (err) {
                            res.send({'error': 'An error has occurred'});
                        } else {
                            if (result.password === itemUser.password) {
                                res.send({
                                    userName: itemUser.userName,
                                    friends: itemUser.friends,
                                    chats: itemUser.chats,
                                    friendsRequests: itemUser.friendsRequests,
                                    id: itemUser._id
                                });
                            } else {
                                res.send({'error': 'Wrong password!'});
                            }
                        }
                    });
                } else {
                    res.send({'error': 'Wrong email!'});
                }
            }
        });
    });

    app.post('/logout', (req, res) => {
        let result = req.body;
        const user = {userName: result.userName};
        db.collection('users').findOne(user, (error, itemUser) => {
            if (error) {
                res.send({'error': 'An error has occurred'});
            } else {
                if (itemUser) {
                    itemUser.status = 'offline';
                    itemUser.lastSeen = new Date().toJSON();
                    db.collection('users').updateOne(user, itemUser, (err, resultUpd) => {
                        if (err) {
                            res.send({'error': 'An error has occurred'});
                        } else {
                            res.send({'message': 'logout'});
                        }
                    });
                } else {
                    res.send({'message': 'logout'});
                }
            }
        });
    });

    app.get('/users/:userID', (req, res) => {
        db.collection('users').find().toArray((err, allUsers) => {
            if (err) res.send({'error': err});
            else {
                const id = req.params.userID;
                const details = {'_id': new ObjectID(id)};
                db.collection('users').findOne(details, (err, user) => {
                    if (err) res.send(err);
                    else {
                        let users = findUsersNotInFriends(allUsers, user);
                        res.send(users);
                    }
                });

            }
        });
    });

    app.get('/user/:userID/:userName', (req, res) => {
        const id = req.params.userID.toString();
        const details = {'userName': id};
        db.collection('users').findOne(details, (err, user) => {
            if (err) res.send(err);
            else {
                const id = req.params.userName.toString();
                const details = {'userName': id};
                db.collection('users').findOne(details, (err, foundUser) => {
                    if (err) res.send({'error': err});
                    else {
                        if (foundUser) {
                            if (!user.friendsPending.includes(foundUser.userName) && !user.friends.includes(foundUser.userName) && (user.userName !== foundUser.userName)) {
                                let user = [];
                                user.push({
                                    id: foundUser._id,
                                    userName: foundUser.userName,
                                    status: foundUser.status
                                });
                                res.send(user);
                            } else {
                                res.send({'error': 'In list'});
                            }
                        }
                        else {
                            res.send({'error': 'There`s no such user!'});
                        }
                    }
                });
            }
        });
    });

    app.post('/requestFriend', (req, res) => {
        let result = req.body;
        let userID = result.userID;
        let destinationUserID = result.destinationUserID;
        const details = {'_id': new ObjectID(destinationUserID)};
        db.collection('users').findOne(details, (error, destinationUser) => {
            if (error) res.send({'error': error.message});
            else {
                destinationUser.friendsRequests.push(resultInsert.ops[0]._id.toString());
                db.collection('users').updateOne(details, destinationUser, (err, result) => {
                    if (err) {
                        res.send({'error': 'An error has occurred'});
                    } else {
                        const details = {'_id': new ObjectID(userID)};
                        db.collection('users').findOne(details, (error, user) => {
                            if (error) res.send({'error': error.message});
                            else {
                                user.friendsPending.push(destinationUser._id.toString());
                                db.collection('users').updateOne(details, user, (err, result) => {
                                    if (err) {
                                        res.send({'error': 'An error has occurred'});
                                    } else {
                                        res.send({'ok': 'ok'});
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    });

    app.get('/friends/:id', (req, res) => {
        const id = req.params.id;
        const details = {'_id': new ObjectID(id)};
        db.collection('users').findOne(details, (err, user) => {
            if (err) res.send(err);
            else res.send(user.friends);
        });
    });

    app.get('/user/:id', (req, res) => {
        const id = req.params.id;
        const details = {'_id': new ObjectID(id)};
        db.collection('users').findOne(details, (err, user) => {
            if (err) res.send(err);
            else res.send(user);
        });
    });

    app.post('/chat/:idOne/:idTwo', (req, res) => {

    });
};

function findUsersNotInFriends(allUsers, user) {
    let users = [];
    if (user) {
        for (let i = 0; i < allUsers.length; i++) {
            let currID = allUsers[i]._id.toString();
            if (!user.friendsPending.includes(currID) &&
                !user.friends.includes(currID) &&
                (user._id.toString() !== currID)) {
                users.push({
                    id: allUsers[i]._id,
                    userName: allUsers[i].userName,
                    status: allUsers[i].status
                });
            }
        }
    }
    return users;
}

function createNewUser(result) {
    let newUser = {
        email: result.email,
        userName: result.userName,
        password: result.password,
        friends: [],
        chats: [],
        status: 'online',
        friendsRequests: [],
        friendsPending: [],
        lastSeen: new Date().toJSON()
    };
    return newUser;
}