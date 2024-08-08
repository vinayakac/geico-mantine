/**
 * 
 * @param {Array} roles  Array of strings. The roles required to 
 * @returns {String} The highest role that the user has in their list of roles.
 */
export default function getHighestRole(roles) {
    
    // An ordered heirarchy of roles. These are associated with roles on the application registration. 
    // If a new role is added to the application, a new mapping will need to be added here. The numberic values indicate placement in the role heirarchy.
    //NOTE THAT THIS DOES NOT SUPPORT MULTITENANCY THROUGH ROLES. 
    const roleMapping = {
        'reader' : 1,
        'user': 2,
        'admin': 3
    }

    var reverseRoleMapping = {};
    //populate reverseMapping with invers of role key-values
    for(var key in roleMapping) {
        reverseRoleMapping[String(roleMapping[key])] = key;
    }

    //create a list of the numeric values associated with all owned roles
    const ranks = roles.map((value, index) => {
        return (
            roleMapping[value.toLowerCase()]
        )
    });

    //return the role associated with the highest place in the heirarchy
    return reverseRoleMapping[String(Math.max(ranks))];
}